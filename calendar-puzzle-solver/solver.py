from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Set, Tuple

Cell = Tuple[int, int]  # (x, y), 1-based coordinates
Matrix = List[List[int]]


@dataclass(frozen=True)
class Placement:
    piece: str
    cells: frozenset[Cell]


def parse_matrix(matrix: Matrix) -> Set[Tuple[int, int]]:
    cells: Set[Tuple[int, int]] = set()
    for y, row in enumerate(matrix):
        for x, v in enumerate(row):
            if v:
                cells.add((x, y))
    if not cells:
        raise ValueError("发现空形状矩阵（没有任何 1）")
    return cells


def normalize(shape: Set[Tuple[int, int]]) -> frozenset[Tuple[int, int]]:
    min_x = min(x for x, _ in shape)
    min_y = min(y for _, y in shape)
    return frozenset((x - min_x, y - min_y) for x, y in shape)


def rotate90(shape: Set[Tuple[int, int]]) -> Set[Tuple[int, int]]:
    return {(y, -x) for x, y in shape}


def reflect_x(shape: Set[Tuple[int, int]]) -> Set[Tuple[int, int]]:
    return {(-x, y) for x, y in shape}


def unique_orientations(shape: Set[Tuple[int, int]], allow_reflection: bool) -> List[Set[Tuple[int, int]]]:
    seen = set()
    out: List[Set[Tuple[int, int]]] = []
    candidates = [shape]
    if allow_reflection:
        candidates.append(reflect_x(shape))

    for base in candidates:
        cur = set(base)
        for _ in range(4):
            n = normalize(cur)
            if n not in seen:
                seen.add(n)
                out.append(set(n))
            cur = rotate90(cur)
    return out


def connected_components(cells: Set[Cell]) -> List[Set[Cell]]:
    cells = set(cells)
    seen: Set[Cell] = set()
    comps: List[Set[Cell]] = []

    for start in list(cells):
        if start in seen:
            continue
        comp = {start}
        stack = [start]
        seen.add(start)
        while stack:
            x, y = stack.pop()
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nb = (x + dx, y + dy)
                if nb in cells and nb not in seen:
                    seen.add(nb)
                    comp.add(nb)
                    stack.append(nb)
        comps.append(comp)

    return comps


def load_config(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def as_cells(raw: Iterable[Iterable[int]]) -> Set[Cell]:
    return {(int(x), int(y)) for x, y in raw}


def resolve_holes(config: dict, month: Optional[str], day: Optional[int], weekday: Optional[str]) -> Set[Cell]:
    holes = as_cells(config.get("holes", []))

    if month or day is not None or weekday:
        label_map = config.get("label_map")
        if not label_map:
            raise ValueError("使用 --month/--day/--weekday 时，config 必须提供 label_map")

        if month:
            key = month.upper()
            if key not in label_map.get("months", {}):
                raise ValueError(f"month={month} 不在 label_map.months 里")
            holes.add(tuple(label_map["months"][key]))

        if day is not None:
            key = str(day)
            if key not in label_map.get("days", {}):
                raise ValueError(f"day={day} 不在 label_map.days 里")
            holes.add(tuple(label_map["days"][key]))

        if weekday:
            key = weekday.upper()
            if key not in label_map.get("weekdays", {}):
                raise ValueError(f"weekday={weekday} 不在 label_map.weekdays 里")
            holes.add(tuple(label_map["weekdays"][key]))

    return holes


def generate_placements(
    board_w: int,
    board_h: int,
    pieces: Dict[str, Matrix],
    blocked: Set[Cell],
    allow_reflection: bool,
    forbid_reflection: Set[str],
    fixed_piece_positions: Dict[str, Set[Cell]],
) -> Dict[str, List[Placement]]:
    board = {(x, y) for x in range(1, board_w + 1) for y in range(1, board_h + 1)}
    placements: Dict[str, List[Placement]] = {}

    for name, matrix in pieces.items():
        base = parse_matrix(matrix)
        piece_allow_reflection = allow_reflection and (name not in forbid_reflection)
        orients = unique_orientations(base, piece_allow_reflection)

        fixed_cells = fixed_piece_positions.get(name)
        seen = set()
        ps: List[Placement] = []

        for s in orients:
            max_x = max(x for x, _ in s)
            max_y = max(y for _, y in s)
            for oy in range(1, board_h - max_y + 1):
                for ox in range(1, board_w - max_x + 1):
                    cells = frozenset((ox + x, oy + y) for x, y in s)
                    if not cells.issubset(board):
                        continue
                    if cells & blocked:
                        continue
                    if fixed_cells is not None and cells != frozenset(fixed_cells):
                        continue
                    if cells in seen:
                        continue
                    seen.add(cells)
                    ps.append(Placement(piece=name, cells=cells))

        placements[name] = ps

    return placements


def solve(config: dict, month: Optional[str], day: Optional[int], weekday: Optional[str]) -> Optional[Dict[str, Set[Cell]]]:
    board_w, board_h = config["board_size"]
    pieces: Dict[str, Matrix] = config["piece_shapes"]

    holes = resolve_holes(config, month, day, weekday)

    fixed_blocks = {
        name: as_cells(cells)
        for name, cells in config.get("fixed_blocks", {}).items()
    }
    fixed_block_cells: Set[Cell] = set()
    for cells in fixed_blocks.values():
        fixed_block_cells |= cells

    fixed_piece_positions = {
        name: as_cells(cells)
        for name, cells in config.get("constraints", {}).get("fixed_piece_positions", {}).items()
    }

    forbid_reflection = set(config.get("constraints", {}).get("forbid_reflection", []))

    allow_reflection = bool(config.get("allow_reflection", True))

    board = {(x, y) for x in range(1, board_w + 1) for y in range(1, board_h + 1)}
    blocked = holes | fixed_block_cells
    target = board - blocked

    piece_cell_count = sum(sum(v for row in matrix for v in row) for matrix in pieces.values())
    if piece_cell_count != len(target):
        raise ValueError(
            f"拼块总格数({piece_cell_count}) 与可覆盖目标格数({len(target)}) 不一致，无法求解"
        )

    placements = generate_placements(
        board_w=board_w,
        board_h=board_h,
        pieces=pieces,
        blocked=blocked,
        allow_reflection=allow_reflection,
        forbid_reflection=forbid_reflection,
        fixed_piece_positions=fixed_piece_positions,
    )

    names = list(pieces.keys())

    # Optional per-piece hard constraints.
    must_cover = {
        name: as_cells(cells)
        for name, cells in config.get("constraints", {}).get("must_cover", {}).items()
    }
    must_not_cover = {
        name: as_cells(cells)
        for name, cells in config.get("constraints", {}).get("must_not_cover", {}).items()
    }

    for name in names:
        req = must_cover.get(name, set())
        ban = must_not_cover.get(name, set())
        filtered = []
        for p in placements[name]:
            if req and not req.issubset(p.cells):
                continue
            if ban and (ban & p.cells):
                continue
            filtered.append(p)
        placements[name] = filtered
        if not filtered:
            return None

    used: Set[Cell] = set()
    sol: Dict[str, Set[Cell]] = {}

    min_piece_size = min(sum(v for row in pieces[n] for v in row) for n in names)

    def backtrack() -> bool:
        if len(sol) == len(names):
            return used == target

        remaining = [n for n in names if n not in sol]

        # MRV heuristic
        best_name: Optional[str] = None
        best_opts: Optional[List[Placement]] = None
        for n in remaining:
            opts = [p for p in placements[n] if p.cells.isdisjoint(used)]
            if best_name is None or len(opts) < len(best_opts):
                best_name = n
                best_opts = opts

        if not best_opts:
            return False

        for p in best_opts:
            sol[best_name] = set(p.cells)
            used.update(p.cells)

            rem = target - used
            ok = True
            for comp in connected_components(rem):
                if len(comp) < min_piece_size:
                    ok = False
                    break

            if ok and backtrack():
                return True

            used.difference_update(p.cells)
            del sol[best_name]

        return False

    return sol if backtrack() else None


def render_grid(
    board_w: int,
    board_h: int,
    holes: Set[Cell],
    fixed_blocks: Dict[str, Set[Cell]],
    solution: Dict[str, Set[Cell]],
) -> List[str]:
    grid = [["." for _ in range(board_w)] for _ in range(board_h)]

    for x, y in holes:
        grid[y - 1][x - 1] = "□"

    for name, cells in fixed_blocks.items():
        mark = name[0].upper()
        for x, y in cells:
            grid[y - 1][x - 1] = mark

    for name, cells in solution.items():
        mark = name[0].lower()
        for x, y in cells:
            grid[y - 1][x - 1] = mark

    return [" ".join(row) for row in grid]


def main() -> None:
    parser = argparse.ArgumentParser(description="Calendar puzzle solver")
    parser.add_argument("--config", required=True, help="配置文件路径 JSON")
    parser.add_argument("--month", help="月份标签，如 APR")
    parser.add_argument("--day", type=int, help="日期数字，如 15")
    parser.add_argument("--weekday", help="星期标签，如 WED")
    args = parser.parse_args()

    cfg = load_config(args.config)

    solution = solve(cfg, month=args.month, day=args.day, weekday=args.weekday)

    if solution is None:
        print("No solution found under current constraints.")
        return

    board_w, board_h = cfg["board_size"]
    holes = resolve_holes(cfg, args.month, args.day, args.weekday)
    fixed_blocks = {
        name: as_cells(cells)
        for name, cells in cfg.get("fixed_blocks", {}).items()
    }

    print("Solution coordinates (x,y):")
    for piece in sorted(solution):
        print(f"- {piece}: {sorted(solution[piece])}")

    print("\nGrid (top->bottom):")
    for line in render_grid(board_w, board_h, holes, fixed_blocks, solution):
        print(line)


if __name__ == "__main__":
    main()

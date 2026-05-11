---
name: calendar-puzzle-solver-skill
description: 根据日期点与可选约束，求解 10x5 日历拼图布局。
---

# Calendar Puzzle Solver Skill

## 适用场景

- 输入一个日期点（month/day/weekday）并求解拼图
- 偶尔需要额外限制（例如固定橙色块位置）
- 需要输出可直接摆放的坐标/行视图

## 输入约定

### 必填

- `board_size`: `[width, height]`
- `piece_shapes`: 各拼块 0/1 矩阵

### 二选一

1. `holes`: 显式留空坐标列表
2. `label_map` + 命令行参数 `--month --day --weekday`

### 可选

- `fixed_blocks`: 固定障碍块坐标（如橙色 2x3）
- `allow_reflection`: 是否允许翻面（默认 true）
- `constraints`:
  - `forbid_reflection`: 指定块禁用翻面
  - `fixed_piece_positions`: 固定某块坐标
  - `must_cover`: 指定块必须覆盖的格子
  - `must_not_cover`: 指定块禁止覆盖的格子

## 输出

- 每块坐标 `(x,y)`
- 文本棋盘（从上到下每行）
- 无解时提示 `No solution found under current constraints.`

## 调用方式

```bash
python solver.py --config examples/apr_15_wed.json
```

或：

```bash
python solver.py --config your_config.json --month APR --day 15 --weekday WED
```

## 注意事项

- 坐标为 1-based
- 左上角 `(1,1)`
- 如果拼块总格数与待覆盖格数不一致，会直接报错

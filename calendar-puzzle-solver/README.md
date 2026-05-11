# Calendar Puzzle Solver

一个可复用的日历拼图求解器（Python + Skill 文档）。

## 功能

- 输入棋盘、拼块、留空点、固定障碍块
- 支持旋转与可选翻面
- 支持附加约束：
  - `fixed_piece_positions`：固定某块到指定坐标
  - `must_cover`：某块必须覆盖哪些坐标
  - `must_not_cover`：某块不能覆盖哪些坐标
  - `forbid_reflection`：指定块不允许翻面
- 输出每块坐标 + 从上到下文本棋盘

## 快速开始

1. 准备 Python 3.10+
2. 使用示例配置运行：

```bash
python solver.py --config examples/apr_15_wed.json
```

## 按“日期点”输入（可选）

你可以不写 `holes`，改用命令行：

```bash
python solver.py --config your_config.json --month APR --day 15 --weekday WED
```

此时配置需要包含 `label_map`，格式示例：

```json
{
  "label_map": {
    "months": { "APR": [1, 2] },
    "days": { "15": [5, 3] },
    "weekdays": { "WED": [10, 2] }
  }
}
```

## 坐标说明

- 使用 **1-based** 坐标 `(x, y)`
- 左上角 `(1,1)`，右下角 `(width,height)`

## 文件说明

- `solver.py`：主求解程序
- `config.example.json`：通用模板
- `shapes.json`：拼块形状库
- `examples/apr_15_wed.json`：你当前案例示例
- `SKILL.md`：Skill 版规范

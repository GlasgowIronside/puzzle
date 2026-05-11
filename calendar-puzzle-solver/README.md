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

## 网页交互版本

仓库根目录已新增静态网页入口，可直接作为 GitHub Pages 部署目标：

- `index.html`：网页主入口
- `styles.css`：页面样式
- `app.js`：棋盘渲染、交互、自动求解与导入导出逻辑

### 本地打开

建议通过本地静态服务器预览，例如 VS Code Live Server、Python `http.server` 或任意静态文件服务。

### GitHub Pages 部署

1. 将仓库推送到 GitHub
2. 在仓库设置中开启 Pages
3. 选择根目录（`/`）作为发布来源
4. 部署完成后，`index.html` 即为网页入口

### 网页版能力

- 日期点设置（month / day / weekday）
- 点击选择拼块、点击棋盘摆放
- 旋转 / 翻转 / 回收选中拼块
- 自动求解当前布局
- 布局导入 / 导出
- 保存棋盘图片

> 注：当前网页默认使用仓库内的示例配置；如果你有完整的日期映射配置，可以通过“加载配置 JSON”导入后获得完整题面。

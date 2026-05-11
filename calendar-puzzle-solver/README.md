# Calendar Puzzle Solver

一个日历拼图求解器，包含 Python 命令行版本和网页交互版本。

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

### Python 命令行版

1. 准备 Python 3.10+
2. 使用示例配置运行：

```bash
python solver.py --config examples/apr_15_wed.json
```

### 按”日期点”输入（可选）

你可以不写 `holes`，改用命令行：

```bash
python solver.py --config your_config.json --month APR --day 15 --weekday WED
```

此时配置需要包含 `label_map`，格式示例：

```json
{
  “label_map”: {
    “months”: { “APR”: [1, 2] },
    “days”: { “15”: [5, 3] },
    “weekdays”: { “WED”: [10, 2] }
  }
}
```

## 网页交互版本

静态网页应用，无需构建工具，可直接在浏览器中运行。

### 网页版能力

- 两套棋盘方案一键切换（10×5 经典版 / 7×8 扩展版）
- 日期点设置（月 / 日 / 星期）
- 点击选择拼块，悬停棋盘实时预览放置位置
- 拖拽移动已放置的拼块
- 旋转（R）/ 翻转（F）/ 取消选中（E）快捷键
- 自动求解当前布局（异步执行，不阻塞界面）
- 布局 JSON 导入 / 导出
- 保存棋盘为 PNG 图片
- 支持加载自定义配置 JSON

### 本地运行

由于使用了 ES Module，需要通过 HTTP 服务器访问：

```bash
# Python
cd calendar-puzzle-solver
python -m http.server 8080

# 或 Node.js
npx serve .

# 或 VS Code Live Server 插件
```

然后访问 `http://localhost:8080`。

## 部署到 GitHub Pages

### 方法一：通过仓库设置（推荐）

1. 将代码推送到 GitHub 仓库
2. 进入仓库页面，点击 **Settings** → **Pages**
3. Source 选择 **Deploy from a branch**
4. Branch 选择 `main`（或你的默认分支），目录选择 `/calendar-puzzle-solver`
5. 点击 Save，等待几分钟部署完成
6. 访问 `https://<你的用户名>.github.io/<仓库名>/`

### 方法二：通过 GitHub Actions

如果项目根目录不是网页目录，可以使用 Actions 自动部署：

1. 在仓库中创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: calendar-puzzle-solver
      - id: deployment
        uses: actions/deploy-pages@v4
```

2. 进入 Settings → Pages，Source 改为 **GitHub Actions**
3. 推送代码后自动部署

### 部署后验证

- 访问部署 URL，确认页面正常加载
- 切换两套方案，验证棋盘渲染正确
- 点击”自动解”测试求解功能

## 坐标说明

- 使用 **1-based** 坐标 `(x, y)`
- 左上角 `(1,1)`，右下角 `(width,height)`

## 文件说明

| 文件 | 说明 |
| ---- | ---- |
| `solver.py` | Python 命令行求解程序 |
| `config.example.json` | 通用配置模板 |
| `shapes.json` | 拼块形状库 |
| `examples/` | 示例配置目录 |
| `index.html` | 网页主入口 |
| `styles.css` | 页面样式 |
| `app.js` | 棋盘渲染、交互、求解与导入导出逻辑 |

## 第二套方案

网页顶部的”第一套 / 第二套”切换按钮：

- **第一套**：10×5 棋盘 + 固定障碍块，8 个彩色拼块
- **第二套**：7×8 棋盘 + 6 个结构空位，11 个编号拼块，完整月/日/星期标签映射

切换后可以直接自动解或手动摆放，两套方案互不影响。

# DataCom-Animation · 数通设备实验室

用可交互的 2.5D 图形和动画学习数据通信（数通）知识：设备结构、接口、组网、路由协议和上层业务。

## 怎么打开

不需要构建，也没有依赖。直接用浏览器打开 `index.html` 即可；或者在仓库目录运行：

```bash
python3 -m http.server 8000
# 然后访问 http://localhost:8000
```

也可以在仓库的 Settings → Pages 里把 `main` 分支发布为 GitHub Pages。

## 当前内容：设备结构与基础配置

- **逐层拆解**：机框 → 单板（LPU / MPU / SFU）→ 子卡 → 端口 → 接口。滚轮或双指缩放，拖动平移，点击部件深入。
- **讲解面板**：每个部件都有中文说明、要点和配置示例。
- **报文动画**：数据报文穿越路由器、协议报文上送与 FIB 下发、报文在接口板 NP/TM 内的处理。
- **命令行实验**：模拟路由器 R1，支持 `display device`、`display interface brief`、`display ip interface brief`、`ip address`、`shutdown`、子接口、LoopBack 等，配置会实时反映到设备图上。

## 目录结构

```
index.html      页面骨架
css/style.css   样式与配色（亮色 / 暗色两套）
js/app.js       全部逻辑，按区块组织：
                  等轴测投影工具 → 设备模型 → 知识库 KB
                  → 各层视图绘制 → 缩放平移 → 讲解面板 → 报文动画 → 命令行
```

扩展方式：
- 新增知识点：在 `KB` 对象里加一条，并在绘制函数中用 `grp(parent,{kb:'键名'})` 绑定到图形。
- 新增动画：在 `chassisFlows()` / `boardFlows()` 中按步骤写路径点（三维坐标）和说明文字。
- 新增命令：在 `exec()` 中添加分支。

## 路线图

1. ✅ 设备结构与基础配置
2. ⬜ 基础组网：多台设备拓扑、链路类型、直连与静态路由、逐跳转发
3. ⬜ 上层业务：IGP、BGP、L3VPN、SRv6 Policy、EVPN、QoS、PCEP、隧道

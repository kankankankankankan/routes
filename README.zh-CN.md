[English](readme.md) | 简体中文

# Route tools & configurations

## 非中国大陆路由表

本项目通过 GitHub Actions 自动运行 `nchnroutes`，生成 BIRD 可用的路由配置，并通过 Cloudflare Workers 提供 API 访问。

生成结果是“非中国大陆 IP 路由表”。这些路由可以用于 BIRD、OSPF、RouterOS、Linux 网关、隧道接口、旁路由、透明代理网关等场景。

典型用途：

```text
国内 IP        -> 默认路由直连
非中国大陆 IP  -> 指定接口或指定下一跳网关
```

例如透明代理网关场景：

```text
非中国大陆路由 -> 192.168.124.250
国内路由       -> 默认宽带直连
```

## 更新周期

GitHub Actions 默认每 4 小时自动运行一次。

也可以在 GitHub 页面手动触发：

```text
Actions -> Deploy -> Run workflow
```

## API 用法

通过 API 更新 BIRD 配置：

```bash
0 2 * * * curl -s 'https://api.xn--7ovq92diups1e.com/ncr?device=tun0' -o /etc/bird/routes4.conf
0 2 * * * curl -s 'https://api.xn--7ovq92diups1e.com/ncr?mode=6&device=tun0' -o /etc/bird/routes6.conf
```

使用指定下一跳网关：

```bash
0 2 * * * curl -s 'https://api.xn--7ovq92diups1e.com/ncr?via=192.168.124.250' -o /etc/bird/routes4.conf
```

更新后重新加载 BIRD：

```bash
birdc configure
```

## API 参数

```text
mode:
    - 4 : IPv4，默认值
    - 6 : IPv6

device:
    - eth0 : 默认值
    - [string] : 设备名称，例如 tun0、eth1、ens192

via:
    - [ip] : 下一跳网关 IP，支持 IPv4 和 IPv6
    - 设置 via 后，输出会使用 gateway 形式
    - via 优先级高于 device
```

示例：

```text
/ncr?device=tun0
/ncr?mode=6&device=tun0
/ncr?via=192.168.124.250
/ncr?mode=6&via=2001:db8::1
```

## 自定义排除列表

部分 IP 段可能因为上游中国 IP 数据源缺失，错误出现在“非中国大陆路由表”中。

如果某个国内 IP 被错误代理，可以把它加入仓库根目录的 `excludes.txt`。

每行一个 CIDR。

示例：

```text
# 需要从非中国大陆路由表中排除的 CIDR
# 每行一个 CIDR

43.160.156.0/24
```

支持注释和空行：

```text
# Tencent
43.160.156.0/24

# Other direct ranges
43.160.144.0/20
```

GitHub Actions 运行时会读取 `excludes.txt`，并把这些 CIDR 传给 `nchnroutes` 的 `--exclude` 参数。

这些 CIDR 会从生成的非中国大陆路由表中扣除。

最终效果：

```text
43.160.156.0/24 不会出现在 routes4.conf 中
```

透明网关场景下：

```text
非中国大陆路由 -> 192.168.124.250
排除列表中的路由 -> 默认路由直连
```

## 推荐的本地定时任务

IPv4 透明代理网关：

```bash
0 2 * * * curl -s 'https://api.xn--7ovq92diups1e.com/ncr?via=192.168.124.250' -o /etc/bird/routes4.conf && birdc configure
```

IPv4 + IPv6：

```bash
0 2 * * * curl -s 'https://api.xn--7ovq92diups1e.com/ncr?via=192.168.124.250' -o /etc/bird/routes4.conf && birdc configure
0 2 * * * curl -s 'https://api.xn--7ovq92diups1e.com/ncr?mode=6&via=2001:db8::1' -o /etc/bird/routes6.conf && birdc configure
```

## 验证排除是否生效

GitHub Actions 跑完后，可以检查生成结果里是否还包含被排除的 CIDR。

例如：

```bash
curl -s 'https://api.xn--7ovq92diups1e.com/ncr?via=192.168.124.250' | grep '43.160.156'
```

预期结果：

```text
无输出
```

没有输出说明排除已经生效。

也可以直接检查路由文件：

```bash
curl -s 'https://api.xn--7ovq92diups1e.com/ncr?via=192.168.124.250' | grep '43.160.156.0/24'
```

如果没有返回内容，说明该 CIDR 已经从非中国大陆路由表中移除。

## 本项目的工作流程

```text
GitHub Actions
    ↓
checkout nchnroutes
    ↓
读取 excludes.txt
    ↓
运行 produce.py --exclude
    ↓
生成 routes4.conf / routes6.conf
    ↓
发布到 gh-pages
    ↓
Cloudflare Worker 提供 API
    ↓
本地 BIRD 定时拉取
```

## 目录结构

```text
routes/
├── .github/
│   └── workflows/
│       └── autorun.yml
├── excludes.txt
├── cf_worker.js
├── readme.md
└── README.zh-CN.md
```

## excludes.txt 示例

```text
# 需要从非中国大陆路由表中排除的 CIDR
# 每行一个 CIDR
# 空行会被忽略
# 井号开头的是注释

43.160.156.0/24
```

## CN-ASN

生成中国 ASN 列表：

```bash
# ./asn_cn.py -h
usage: asn_cn.py [-h] [-o <file>] [-s [{apnic,he,ipip} ...]] [-v]

Generate China ASN list for BIRD.

optional arguments:
  -h, --help            show this help message and exit
  -o, --output <file>   write to file(default: asn_cn.conf)
  -s, --source [{apnic,he,ipip} ...]
                        multiple sources can be used at the same time (default: apnic he ipip)
  -v, --version         show program's version number and exit
```

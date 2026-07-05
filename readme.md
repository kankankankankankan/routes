English | [简体中文](README.zh-CN.md)

# Route tools & configurations

## Non-cn-routes

This project runs `nchnroutes` automatically with GitHub Actions and publishes generated BIRD route configs through Cloudflare Workers.

The generated routes are non-Mainland-China IP routes. They can be used with BIRD, OSPF, RouterOS, Linux gateways, tunnel interfaces, or a transparent proxy gateway.

## Update interval

GitHub Actions runs every 4 hours by default.

Manual run is also supported from:

```text
Actions -> Deploy -> Run workflow
```

## API usage

Update BIRD configs by API:

```bash
0 2 * * * curl -s 'https://api.xn--7ovq92diups1e.com/ncr?device=tun0' -o /etc/bird/routes4.conf
0 2 * * * curl -s 'https://api.xn--7ovq92diups1e.com/ncr?mode=6&device=tun0' -o /etc/bird/routes6.conf
```

Use a next-hop gateway instead of an interface:

```bash
0 2 * * * curl -s 'https://api.xn--7ovq92diups1e.com/ncr?via=192.168.124.250' -o /etc/bird/routes4.conf
```

Reload BIRD after updating:

```bash
birdc configure
```

## API params

```text
mode:
    - 4 : IPv4, default
    - 6 : IPv6

device:
    - eth0 : default
    - [string] : device name, for example tun0, eth1, ens192

via:
    - [ip] : next-hop gateway IP, supports IPv4 and IPv6
    - If via is set, output uses gateway form via <ip> and ignores device
```

Examples:

```text
/ncr?device=tun0
/ncr?mode=6&device=tun0
/ncr?via=192.168.124.250
/ncr?mode=6&via=2001:db8::1
```

## Custom exclusions

Some IP ranges may be registered or detected incorrectly by upstream China IP lists.

Put these ranges into `excludes.txt` in the repository root. One CIDR per line.

Example:

```text
# CIDR ranges to remove from generated non-China routes.
# One CIDR per line.

43.160.156.0/24
```

Lines starting with `#` are comments. Empty lines are ignored.

When GitHub Actions runs, these CIDR ranges are passed to `nchnroutes` with `--exclude`. The excluded ranges will be removed from the generated non-China route table.

This is useful when a Mainland-China service IP is included in the generated non-China routes and is incorrectly sent to a proxy gateway.

Example result:

```text
43.160.156.0/24 will not appear in routes4.conf
```

For a transparent gateway setup:

```text
non-China routes -> 192.168.124.250
excluded routes  -> normal default route
```

## Recommended local cron

IPv4 with transparent proxy gateway:

```bash
0 2 * * * curl -s 'https://api.xn--7ovq92diups1e.com/ncr?via=192.168.124.250' -o /etc/bird/routes4.conf && birdc configure
```

IPv4 and IPv6:

```bash
0 2 * * * curl -s 'https://api.xn--7ovq92diups1e.com/ncr?via=192.168.124.250' -o /etc/bird/routes4.conf && birdc configure
0 2 * * * curl -s 'https://api.xn--7ovq92diups1e.com/ncr?mode=6&via=2001:db8::1' -o /etc/bird/routes6.conf && birdc configure
```

## Verify exclusions

After GitHub Actions finishes, check whether the excluded CIDR still appears in the generated config:

```bash
curl -s 'https://api.xn--7ovq92diups1e.com/ncr?via=192.168.124.250' | grep '43.160.156'
```

Expected result:

```text
no output
```

If there is no output, the exclusion is active.

# CN-ASN

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

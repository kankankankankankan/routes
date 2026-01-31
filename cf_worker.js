addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  if (request.method !== "GET") return MethodNotAllowed(request)

  const { searchParams } = new URL(request.url)

  const mode = (searchParams.get("mode") || "4").trim()
  const device = (searchParams.get("device") || "eth0").trim()
  const via = (searchParams.get("via") || "").trim()

  if (mode !== "4" && mode !== "6") {
    return new Response("网络协议版本参数错误！", { status: 400 })
  }

  if (!isValidIfName(device)) {
    return new Response("device 参数不合法。", { status: 400 })
  }

  if (via && !(isIPv4(via) || isIPv6(via))) {
    return new Response("via 参数不合法。", { status: 400 })
  }

  const data_url = `https://raw.githubusercontent.com/kankankankankankan/routes/gh-pages/eth0/routes${mode}.conf`
  const upstream = await fetch(data_url)

  if (!upstream.ok) return InternalServerError()

  const body = await upstream.text()

  const replaced = via
    ? body.replaceAll('via "eth0"', `via ${via}`)
    : body.replaceAll('via "eth0"', `via "${device}"`)

  return new Response(replaced, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  })
}

function isValidIfName(s) {
  return /^[a-zA-Z0-9_.:-]{1,32}$/.test(s)
}

function isIPv4(s) {
  const m = s.match(/^(\d{1,3})(\.\d{1,3}){3}$/)
  if (!m) return false
  const parts = s.split(".")
  for (const p of parts) {
    if (p.length > 1 && p.startsWith("0")) {
      // 允许的话可以删掉这段，这里是避免 001 这类歧义
      return false
    }
    const n = Number(p)
    if (!Number.isInteger(n) || n < 0 || n > 255) return false
  }
  return true
}

function isIPv6(s) {
  // 宽松校验，覆盖常见压缩写法
  if (!/^[0-9a-fA-F:]+$/.test(s)) return false
  if (!s.includes(":")) return false
  if (s.split("::").length > 2) return false
  return true
}

function MethodNotAllowed(request) {
  return new Response(`请求方法 ${request.method} 不允许。`, {
    status: 405,
    headers: { Allow: "GET" },
  })
}

function InternalServerError() {
  return new Response("内部服务器错误。", { status: 500 })
}

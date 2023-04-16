addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {

  const { searchParams } = new URL(request.url)
  let device = searchParams.get('device') || 'eth0'
  let mode = searchParams.get('mode') || '4'

  if (mode !== '4' && mode !== '6') {
    return new Response("网络协议版本参数错误！", { status: 400 })
  }

  let data_url = `https://raw.githubusercontent.com/RyoLee/routes/gh-pages/eth0/routes${mode}.conf`
  if (request.method !== 'GET') return MethodNotAllowed(request)
  const response = await fetch(data_url)

  if (response.ok) {
    const body = await response.text();
    return new Response(body.replaceAll('eth0', device))
  } else {
    return InternalServerError()
  }
}

function MethodNotAllowed(request) {
  return new Response(`请求方法 ${request.method} 不允许。`, {
    status: 405,
    headers: {
      Allow: 'GET',
    },
  });
}

function InternalServerError() {
  return new Response(`内部服务器错误。`, {
    status: 500,
  });
}

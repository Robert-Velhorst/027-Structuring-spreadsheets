export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/hai/')) {
      return Response.json({
        ok: false,
        error: {
          code: 'SERVICE_NOT_CONFIGURED',
          message: 'Open Connections and enter the HTTPS endpoint created by the Sheet Shaper ngrok launcher.',
          retrySafe: true,
        },
      }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    }
    return env.ASSETS.fetch(request)
  },
}

# Cloudflare Logpush to Logtail Worker

## Why?

This worker will allow you to use Logpush with Logtail. Logpush gzips the request body for the HTTP destination and Logtail does not accept gzipped content, this worker will decompress and send to in.logtail.com. More info in [this post](https://medium.com/@RhinosaurRyan_67412/cloudflare-workers-tracing-with-logtail-49bac43b12d).

## Prerequisites

1. Cloudflare `wrangler` installed (`npm i -g wrangler`)
1. Your Cloudflare email address
1. Your Cloudflare API Key
1. Your Cloudflare Account ID
1. Your Cloudflare `worker.dev` Subdomain
1. Your [Logtail SOURCE_TOKEN for HTTP](https://betterstack.com/docs/logs/http-rest-api/)

## Setup

1. Enable Logpush in one of your Cloudflare workers
1. Clone this repo
1. Deploy this worker via `wrangler publish`
1. Create your logpush job:

```
curl -s -X POST 'https://api.cloudflare.com/client/v4/accounts/<your-cloudflare-account-id>/logpush/jobs' -X POST -d '
{
  "name": "cf-logpush-to-logtail",
  "output_options": {
    "field_names": ["Event", "EventTimestampMs", "Outcome", "Exceptions", "Logs", "ScriptName"],
    "timestamp_format": "rfc3339"
  },
  "destination_conf": "https://cf-logpush-to-logtail.<your-worker-subdomain>.workers.dev?header_Authorization=Bearer%20<your-logtail-token>&header_Content-Type=application/json",
  "max_upload_bytes": 5000000,
  "max_upload_records": 1000,
  "dataset": "workers_trace_events",
  "enabled": true
}' -H "X-Auth-Email: <your-cloudflare-email>" -H "X-Auth-Key: <your-cloudflare-api-key>"
```

## Credits

Modified from [the gist](https://gist.github.com/stefandanaita/88c4d8b187400d5b07524cd0a12843b2) by @stefandanaita

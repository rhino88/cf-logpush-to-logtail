// SPDX-License-Identifier: MIT-0

export interface Env {}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    if (!request.headers.get("Content-Encoding")?.includes("gzip")) {
      return new Response("Not Gzipped", { status: 500 });
    }

    if (!request.body) {
      return new Response("Oops", { status: 500 });
    }

    const authorizationHeader = request.headers.get("Authorization");
    if (!authorizationHeader) {
      return new Response("Oops", { status: 500 });
    }

    const events = request.body
      .pipeThrough(new DecompressionStream("gzip"))
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(readlineStream());

    const promises = [];
    for await (const event of streamAsyncIterator(events)) {
      // Do stuff with the event
      const parsedEvent = JSON.parse(event);
      promises.push(
        fetch("https://in.logtail.com/", {
          method: "POST",
          body: JSON.stringify(parsedEvent),
          headers: {
            Authorization: authorizationHeader,
            "Content-Type": "application/json",
          },
        })
      );
    }

    ctx.waitUntil(
      Promise.all(promises).then((responses) =>
        responses.forEach((r) => console.log("Request status: " + r.status))
      )
    );

    return new Response("Success!");
  },
};

async function* streamAsyncIterator(stream: ReadableStream) {
  // Get a lock on the stream
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

interface ReadlineTransformerOptions {
  skipEmpty: boolean;
}

const defaultOptions: ReadlineTransformerOptions = {
  skipEmpty: true,
};

export class ReadlineTransformer implements Transformer {
  options: ReadlineTransformerOptions;
  lastString: string;
  separator: RegExp;

  public constructor(options?: ReadlineTransformerOptions) {
    this.options = { ...defaultOptions, ...options };
    this.lastString = "";
    this.separator = /[\r\n]+/;
  }

  public transform(
    chunk: string,
    controller: TransformStreamDefaultController<string>
  ) {
    // prepend with previous string (empty if none)
    const str = `${this.lastString}${chunk}`;
    // Extract lines from chunk
    const lines = str.split(this.separator);
    // Save last line as it might be incomplete
    this.lastString = (lines.pop() || "").trim();

    // eslint-disable-next-line no-restricted-syntax
    for (const line of lines) {
      const d = this.options.skipEmpty ? line.trim() : line;
      if (d.length > 0) controller.enqueue(d);
    }
  }

  public flush(controller: TransformStreamDefaultController<string>) {
    if (this.lastString.length > 0) controller.enqueue(this.lastString);
  }
}

export const readlineStream = () =>
  new TransformStream(new ReadlineTransformer());

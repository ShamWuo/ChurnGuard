import Document, { Html, Head, Main, NextScript, DocumentContext, DocumentInitialProps } from 'next/document'

interface Props extends DocumentInitialProps {
  nonce?: string
}

export default class MyDocument extends Document<Props> {
  static async getInitialProps(ctx: DocumentContext): Promise<Props> {
    const initialProps = await Document.getInitialProps(ctx)
    // Read nonce forwarded by middleware; fallback to undefined
    const req: any = ctx.req as any
    const nonce = req?.headers?.['x-csp-nonce'] || req?.headers?.['X-CSP-Nonce']
    return { ...initialProps, nonce: Array.isArray(nonce) ? nonce[0] : nonce }
  }

  render() {
    const nonce = (this.props as Props).nonce
    return (
  <Html lang="en">
        <Head />
        <body>
          <Main />
          {/* Apply nonce to all Next-managed inline scripts */}
          <NextScript nonce={nonce} />
        </body>
      </Html>
    )
  }
}

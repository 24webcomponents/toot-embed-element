const styles = new CSSStyleSheet()
styles.replaceSync(`
:host {
  display: grid;
  border: 1px solid grey;
  grid-template:
    "avatar  author_name author_name" 25px
    "avatar  handle      handle" 25px
    "content content     content" max-content
    "backlink backlink   backlink" 25px
    / 60px auto auto;
}

[part="avatar"] {
  grid-area: avatar;
  border-radius: 4px;
}
[part="author_name"] {
  grid-area: author_name
}
[part="handle"] {
  grid-area: handle
}
[part="content"] {
  grid-area: content
}
[part="backlink"] {
  grid-area: backlink
}
`)

/**
 * An example Custom Element. This documentation ends up in the
 * README so describe how this elements works here.
 *
 * You can event add examples on the element is used with Markdown.
 *
 * ```
 * <toot-embed></toot-embed>
 * ```
 */
class TootEmbedElement extends HTMLElement {
  static observeAttributes = ['src']
  #renderRoot!: ShadowRoot

  get src() {
    return this.getAttribute('src') || ''
  }

  set src(value: string) {
    this.setAttribute('src', `${value}`)
  }

  get #contentPart() {
    return this.#renderRoot.querySelector('[part=content]')
  }

  get #authorNamePart() {
    return this.#renderRoot.querySelector('[part=author_name]')
  }

  get #authorHandlePart() {
    return this.#renderRoot.querySelector('[part=author_handle]')
  }

  get #avatarPart() {
    return this.#renderRoot.querySelector('[part=avatar]')
  }

  get #backlinkPart() {
    return this.#renderRoot.querySelector('[part=backlink]')
  }


  connectedCallback(): void {
    this.#renderRoot = this.attachShadow({mode: 'open'})
    this.#renderRoot.adoptedStyleSheets.push(styles)
    this.#renderRoot.innerHTML = `
      <img part="avatar" width="50">
      <span part="author_name"></span>
      <span part="author_handle"></span>
      <div part="content"></div>
      <a part="backlink" href="">Original Toot</a>
    `
    if (this.querySelector('script[type="application/json"]')) {
      return this.#render(JSON.parse(this.querySelector('script[type="application/json"]').textContent))
    }
    if (this.src) this.load()
  }

  attributeChangedCallback(name: 'src', oldValue: string | null, newValue: string | null) {
    if (this.isConnected) return
    if (this.#renderRoot) return
    if (oldValue === newValue) return
    this.load()
  }

  async load() {
    const src = new URL(this.src, window.location.origin)
    const response = await fetch(src)
    console.log(response)
    this.#render(await response.json())
  }

  #render(json: unknown) {
    const {account, url, content} = json
    console.log(json)
    this.#authorNamePart.innerHTML = account.display_name
    const handleURL = new URL(account.url)
    this.#authorHandlePart.innerHTML = `${handleURL.pathname.slice(1)}@${handleURL.hostname}`
    this.#avatarPart.src = account.avatar
    this.#contentPart.innerHTML = content
    this.#backlinkPart.href = url
  }
}

declare global {
  interface Window {
    TootEmbedElement: typeof TootEmbedElement
  }
}

export default TootEmbedElement

if (!window.customElements.get('toot-embed')) {
  window.TootEmbedElement = TootEmbedElement
  window.customElements.define('toot-embed', TootEmbedElement)
}

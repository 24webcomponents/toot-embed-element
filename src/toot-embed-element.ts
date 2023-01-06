const html = String.raw
const styles = new CSSStyleSheet()
styles.replaceSync(`
:host(:not(:--loading)) {
  display: grid;
  max-inline-size: 36em;
  padding: 0.5em;
  gap: 0.5em;
  border: 0.0625em solid grey;
  border-radius: 0.5em;
  grid-template:
    "avatar   author-link author-link" max-content
    "content  content     content"     max-content
    "backlink backlink    backlink"    max-content
    / min-content auto auto;
}

[part="avatar"] {
  max-inline-size: 3.125em;
  aspect-ratio: 1;
  grid-area: avatar;
  border-radius: 0.25em;
}
[part="author-link"] {
  display: grid;
  align-self: center;
  grid-area: author-link
}
[part="handle"] {
  grid-area: handle
}
[part="content"] {
  grid-area: content;
  line-height: 1.5;
}
[part="content"] > * {
  margin-block: 0;
}
[part="content"] > * + * {
  margin-block-start: 0.5em;
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
  #internals!: ElementInternals
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

  get #authorLinkPart() {
    return this.#renderRoot.querySelector('[part=author-link]')
  }

  get #authorNamePart() {
    return this.#renderRoot.querySelector('[part=author-name]')
  }

  get #authorHandlePart() {
    return this.#renderRoot.querySelector('[part=author-handle]')
  }

  get #avatarPart() {
    return this.#renderRoot.querySelector('[part=avatar]')
  }

  get #backlinkPart() {
    return this.#renderRoot.querySelector('[part=backlink]')
  }

  connectedCallback(): void {
    this.#internals = this.attachInternals()
    this.#internals.role = 'article'
    this.#renderRoot = this.attachShadow({mode: 'open'})
    this.#renderRoot.adoptedStyleSheets.push(styles)
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
    this.#internals.states.add('--loading')
    const {tootId} = this.#useParams()
    const apiURL = new URL(`/api/v1/statuses/${tootId}`, this.src)
    const response = await fetch(apiURL)
    console.log(response)

    this.#render(await response.json())
    this.#internals.states.delete('--loading')
  }

  #render(json) {
    const {account, url, content} = json
    console.log(json)
    const handleURL = new URL(account.url)
    const {handle} = this.#useParams()
    this.#renderRoot.innerHTML = html`
      <img part="avatar" src="${account.avatar}" alt="" />
      <a part="author-link" href="${handleURL.href}">
        <span part="author-name">${account.display_name}</span>
        <span part="author-handle">@${handle}@${handleURL.hostname}</span>
      </a>
      <div part="content">${content}</div>
      <a part="backlink" href="${url}" rel="bookmark">Original Toot</a>
    `
    this.#internals.states.add('--ready')
    this.#internals.ariaLabel = `${this.#authorLinkPart.textContent} ${this.#contentPart.textContent}`
  }

  // URLPattern only works in Chromium right now.
  // Could refactor this to use RegExp for compatibility
  /* @ts-ignore */
  #shortPattern = new URLPattern({pathname: '/@:handle/:tootId(\\d+)'})
  /* @ts-ignore */
  #longPattern = new URLPattern({pathname: '/users/:handle/statuses/:tootId(\\d+)'})
  // Toot URLs can have two different formats:
  // 1. https://indieweb.social/@keithamus/109524390152251545
  // 2. https://indieweb.social/users/keithamus/statuses/109524390152251545
  #useParams(): {[key: string]: string} {
    const groups = (this.#shortPattern.exec(this.src) ?? this.#longPattern.exec(this.src))?.pathname.groups
    if (groups) return groups
    throw `This doesn’t seem to be a toot URL: ${this.src}`
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

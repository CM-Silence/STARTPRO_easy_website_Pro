import { escapeHtml, renderHeading, renderParagraph, wrapSection } from '../utils'

export const renderNewsList = (component: any): string => {
  const { props = {} } = component
  const { title, subtitle, items = [], articles = []} = props
  const listItems = items.length > 0 ? items : articles
  const list = listItems
    .map((news: any) => `<article class="news-item">
      ${news.image ? `<div class="news-item-image"><img src="${escapeHtml(news.image)}" alt="${escapeHtml(news.title || '')}" loading="lazy" /></div>` : ''}
      ${renderHeading('h3', news.title)}
      ${news.date ? `<p class="news-date">${escapeHtml(news.date)}</p>` : ''}
      ${renderParagraph(news.excerpt || news.summary)}
    </article>`)
    .join('')
  return wrapSection('news-list', `${renderHeading('h2', title)}${renderParagraph(subtitle)}${list}`)
}

export const renderVideoPlayer = (component: any): string => {
  const { props = {} } = component
  const { title, description, url, poster } = props
  return wrapSection(
    'video-player',
    `${renderHeading('h2', title)}${renderParagraph(description)}
    <video controls ${poster ? `poster="${escapeHtml(poster)}"` : ''}>
      ${url ? `<source src="${escapeHtml(url)}" />` : ''}
    </video>`
  )
}

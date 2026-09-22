import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  articlePath,
  getArticleAuthor,
  getArticleById,
  getRelatedArticles,
  isInsightSaved,
  toggleInsightSaved,
} from '../data/articles'
import { flowState, goBackToOrigin } from '../lib/careFlow'
import { useTransition } from './PageTransition'
import { BookingReveal, useBookingReveal } from './BookingReveal'
import { useRegisteredScroller, useScrollLock } from '../hooks/useScrollLock'
import { usePushBack } from '../features/pushNav'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import { refreshPageData } from '../features/sync/pageRefresh'
import InsightCard from './InsightCard'
import './HealthInsights.css'
import './ArticlePage.css'

function ArticleSkeleton() {
  return (
    <div className="article-skel" aria-hidden="true">
      <div className="article-hero shimmer" />
      <div className="article-skel-meta">
        <span className="article-skel-chip shimmer" />
        <span className="article-skel-meta-line shimmer" />
        <span className="article-skel-meta-line is-date shimmer" />
      </div>
      <div className="article-skel-title shimmer" />
      <div className="article-skel-title is-short shimmer" />
      <div className="article-skel-author">
        <span className="article-skel-avatar shimmer" />
        <span className="article-skel-author-copy">
          <span className="article-skel-line is-name shimmer" />
          <span className="article-skel-line is-role shimmer" />
        </span>
      </div>
      <div className="article-skel-body">
        <span className="article-skel-line shimmer" />
        <span className="article-skel-line shimmer" />
        <span className="article-skel-line is-mid shimmer" />
        <span className="article-skel-heading shimmer" />
        <span className="article-skel-line shimmer" />
        <span className="article-skel-line shimmer" />
        <span className="article-skel-line is-short shimmer" />
      </div>
      <div className="article-skel-related">
        <span className="article-skel-label shimmer" />
        <div className="article-skel-related-row">
          <span className="article-skel-card shimmer" />
          <span className="article-skel-card shimmer" />
        </div>
      </div>
    </div>
  )
}

export default function ArticlePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { openInsights } = useTransition()
  const article = getArticleById(id)
  const author = getArticleAuthor(article)
  const related = getRelatedArticles(article)
  const scrollRef = useRef(null)
  const [saved, setSaved] = useState(() => isInsightSaved(id))
  const contentReady = useBookingReveal(`article:${id}`, Boolean(article), {
    instant: Boolean(article),
    hasCache: Boolean(article),
  })
  const goBack = usePushBack(() => goBackToOrigin(navigate, location, { openInsights }))
  const onRefresh = useCallback(() => refreshPageData(), [])
  const ptr = usePullToRefresh(scrollRef, onRefresh)

  useRegisteredScroller(`article:${id}`, scrollRef)
  useScrollLock(`article:${id}`, Boolean(article) && !contentReady)

  useEffect(() => {
    setSaved(isInsightSaved(id))
    scrollRef.current?.scrollTo({ top: 0 })
  }, [id])

  useEffect(() => {
    if (article) return undefined
    navigate('/', { replace: true })
    return undefined
  }, [article, navigate])

  if (!article) return null

  const openRelated = (next) => {
    if (!next?.id || next.id === article.id) return
    navigate(articlePath(next.id), {
      state: flowState(location, {
        origin: location.state?.origin || 'article',
        returnTo: articlePath(article.id),
      }),
    })
  }

  const share = async () => {
    const payload = {
      title: article.title,
      text: article.title,
      url: window.location.href,
    }
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(payload)
      } catch {
        /* user cancelled */
      }
    }
  }

  const toggleSaved = () => setSaved(toggleInsightSaved(article.id))

  return (
    <div className={`article-page page-push-in ${contentReady ? 'is-content-ready' : 'is-skeleton'}`}>
      <header className="article-header">
        <div className="article-header-side is-start">
          <button
            type="button"
            className="ds-icon-btn is-subtle is-md article-back-btn"
            data-push-back
            onClick={goBack}
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        </div>
        <h1 className="article-header-title">Article</h1>
        <div className="article-header-side is-end">
          <button type="button" className="ds-icon-btn is-subtle is-md" onClick={share} aria-label="Share">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </button>
          <button
            type="button"
            className={`ds-icon-btn is-subtle is-md ${saved ? 'is-selected' : ''}`}
            onClick={toggleSaved}
            aria-label={saved ? 'Remove bookmark' : 'Bookmark'}
            aria-pressed={saved}
          >
            <svg
              viewBox="0 0 24 24"
              fill={saved ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>
      </header>

      <div className={`article-scroll ${contentReady ? '' : 'is-loading'}`} ref={scrollRef}>
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />
        <BookingReveal ready={contentReady} skeleton={<ArticleSkeleton />}>
          <div className="article-hero">
            <img src={article.hero} alt="" />
          </div>

          <div className="article-meta">
            <span className="article-category">{article.category}</span>
            <span className="article-meta-dot" aria-hidden="true">•</span>
            <span>{article.readTime}</span>
            <span className="article-meta-dot" aria-hidden="true">•</span>
            <span>{article.date}</span>
          </div>

          <h2 className="article-title">{article.title}</h2>

          {author ? (
            <button
              type="button"
              className="article-author"
              onClick={() => {
                if (!author.doctorId) return
                navigate(`/doctor/${author.doctorId}`, {
                  state: flowState(location, {
                    origin: 'article',
                    returnTo: articlePath(article.id),
                  }),
                })
              }}
            >
              {author.photo ? (
                <img className="article-author-photo" src={author.photo} alt="" />
              ) : (
                <span className="article-author-photo is-fallback" aria-hidden="true">
                  {author.name.replace(/^Dr\.?\s*/i, '').charAt(0)}
                </span>
              )}
              <span className="article-author-copy">
                <span className="article-author-name">{author.name}</span>
                <span className="article-author-role">{author.title}</span>
              </span>
            </button>
          ) : null}

          <div className="article-body">
            {article.sections.map((block) => (
              block.type === 'h2'
                ? <h3 key={block.text}>{block.text}</h3>
                : <p key={block.text}>{block.text}</p>
            ))}
          </div>

          {related.length > 0 ? (
            <section className="article-related" aria-label="Related insights">
              <h3 className="article-related-title">Related insights</h3>
              <div className="insights-scroll">
                {related.map((item) => (
                  <InsightCard
                    key={item.id}
                    article={item}
                    onClick={() => openRelated(item)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <div className="end-of-page-placeholder">- You've reached the end -</div>
        </BookingReveal>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPageBySlug } from '../../api';
import heroImage from '../../assets/speech-hearing-therapy-hero.png';
import './BrandPage.css';

const parseExtraData = (detail) => {
  if (!detail?.extra_data) return {};
  if (typeof detail.extra_data === 'object') return detail.extra_data;

  try {
    return JSON.parse(detail.extra_data);
  } catch {
    return {};
  }
};

const splitContent = (content) => {
  if (!content) return [];
  return String(content)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const getSection = (sections, key) => sections.find((section) => section.section === key);

const BrandPage = () => {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    setIsLoading(true);
    setError('');

    getPageBySlug(slug)
      .then((data) => {
        if (!ignore) {
          setPage(data.page);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || 'Brand page not found.');
          setPage(null);
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [slug]);

  const sections = useMemo(() => page?.details || [], [page]);
  const hero = getSection(sections, 'hero');
  const overview = getSection(sections, 'overview');
  const services = getSection(sections, 'services');
  const audience = getSection(sections, 'audience');
  const outcomes = getSection(sections, 'outcomes');
  const note = getSection(sections, 'note');
  const related = getSection(sections, 'related');

  const heroData = parseExtraData(hero);
  const serviceData = parseExtraData(services);
  const audienceData = parseExtraData(audience);
  const outcomeData = parseExtraData(outcomes);
  const relatedData = parseExtraData(related);

  if (isLoading) {
    return (
      <main className="brand-page brand-page-state">
        <div className="brand-state-panel">
          <span className="brand-state-kicker">Loading</span>
          <h1>Preparing program details</h1>
          <p>Fetching the latest brand content from the backend.</p>
        </div>
      </main>
    );
  }

  if (error || !page) {
    return (
      <main className="brand-page brand-page-state">
        <div className="brand-state-panel">
          <span className="brand-state-kicker">Not found</span>
          <h1>Brand page is unavailable</h1>
          <p>{error || 'This brand page could not be loaded right now.'}</p>
          <Link className="brand-state-link" to="/">Go home</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="brand-page">
      <section className="brand-hero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="brand-hero-shade" />
        <div className="brand-hero-content">
          <span className="brand-eyebrow">{heroData.eyebrow || 'Simple Speech & Hearing Clinic'}</span>
          <h1>{page.title}</h1>
          <p>{hero?.subtitle || page.description}</p>

          {heroData.highlights?.length > 0 && (
            <div className="brand-highlight-row" aria-label="Program highlights">
              {heroData.highlights.map((highlight) => (
                <span key={highlight}>{highlight}</span>
              ))}
            </div>
          )}

          <div className="brand-hero-actions">
            <a href="#program-focus" className="brand-primary-link">View Focus Areas</a>
            <a href="#who-it-helps" className="brand-secondary-link">Who It Helps</a>
          </div>
        </div>
      </section>

      <section className="brand-overview-band">
        <div className="brand-container brand-overview-grid">
          <div>
            <span className="brand-section-label">Overview</span>
            <h2>{overview?.title || 'Program Overview'}</h2>
          </div>
          <div className="brand-copy">
            {splitContent(overview?.content || page.description).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="brand-section" id="program-focus">
        <div className="brand-container">
          <div className="brand-section-heading">
            <span className="brand-section-label">{services?.subtitle || 'Care Areas'}</span>
            <h2>{services?.title || 'Program Focus'}</h2>
          </div>

          <div className="brand-card-grid">
            {(serviceData.items || []).map((item) => (
              <article className="brand-service-card" key={item.title}>
                <span className="brand-card-code">{item.code}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="brand-section brand-section-soft" id="who-it-helps">
        <div className="brand-container brand-two-column">
          <div className="brand-panel">
            <span className="brand-section-label">{audience?.subtitle || 'Suitable For'}</span>
            <h2>{audience?.title || 'Who It Helps'}</h2>
            <div className="brand-list">
              {(audienceData.items || []).map((item) => (
                <div className="brand-list-item" key={item}>
                  <span />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="brand-panel brand-panel-accent">
            <span className="brand-section-label">{outcomes?.subtitle || 'Goals'}</span>
            <h2>{outcomes?.title || 'Development Goals'}</h2>
            <div className="brand-list">
              {(outcomeData.items || []).map((item) => (
                <div className="brand-list-item" key={item}>
                  <span />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {(note || related) && (
        <section className="brand-section brand-final-band">
          <div className="brand-container brand-final-grid">
            {note && (
              <div className="brand-note">
                <span className="brand-section-label">{note.subtitle || 'Note'}</span>
                <h2>{note.title}</h2>
                {splitContent(note.content).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            )}

            {relatedData.items?.length > 0 && (
              <div className="brand-related">
                <span className="brand-section-label">{related?.subtitle || 'Related'}</span>
                <h2>{related?.title || 'Related Programs'}</h2>
                <div className="brand-related-links">
                  {relatedData.items.map((item) => (
                    <Link key={item.slug} to={`/brands/${item.slug}`}>
                      {item.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
};

export default BrandPage;

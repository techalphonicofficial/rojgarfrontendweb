import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { optionalAuthApiRequest, resolveAssetUrl } from '../../api';
import HeroSection from '../../components/HeroSection/HeroSection';
import './Home.css';

const FALLBACK_ROLE_CARDS = [
  { key: 'fallback-software', name: 'Software Development', categoryName: 'Technology', industryName: 'IT & Software' },
  { key: 'fallback-sales', name: 'Sales', categoryName: 'Business', industryName: 'Sales & Marketing' },
  { key: 'fallback-healthcare', name: 'Healthcare', categoryName: 'Medical', industryName: 'Healthcare' },
  { key: 'fallback-delivery', name: 'Delivery Operations', categoryName: 'Operations', industryName: 'Operations & Logistics' },
];

const COMPANY_TONES = ['brand-blue', 'brand-red', 'brand-orange', 'brand-indigo', 'brand-pink', 'brand-teal'];

const FALLBACK_COMPANIES = [
  {
    name: 'Tech Mahindra',
    description: 'Technology services and digital transformation roles.',
    logo: 'TM',
    tone: 'brand-blue',
    jobs: '28 open roles'
  },
  {
    name: 'Zomato',
    description: 'Food delivery, operations, and customer support hiring.',
    logo: 'Z',
    tone: 'brand-red',
    jobs: '19 open roles'
  },
  {
    name: 'Swiggy',
    description: 'Delivery, field operations, and city team opportunities.',
    logo: 'S',
    tone: 'brand-orange',
    jobs: '24 open roles'
  },
  {
    name: 'Kotak Life Insurance',
    description: 'Sales, advisory, and financial services openings.',
    logo: 'KL',
    tone: 'brand-indigo',
    jobs: '16 open roles'
  },
  {
    name: 'Zepto',
    description: 'Quick commerce, warehouse, and delivery jobs.',
    logo: 'ZP',
    tone: 'brand-pink',
    jobs: '21 open roles'
  },
  {
    name: 'TechCorp Solutions',
    description: 'Engineering, product, and design opportunities.',
    logo: 'TC',
    tone: 'brand-teal',
    jobs: '12 open roles'
  }
];



const companyJobsUrl = (company) => `/jobs?type=normal&company=${encodeURIComponent(company.name)}`;
const roleJobsUrl = (role) => {
  const params = new URLSearchParams();

  if (role.categoryId) params.set('category_id', role.categoryId);
  if (role.roleId) {
    params.set('job_role_id', role.roleId);
    params.set('role_name', role.name);
  }

  const query = params.toString();
  return `/jobs${query ? `?${query}` : ''}`;
};

const getInitials = (name = '') => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase() || 'RS';

const formatOpenRoles = (count) => `${count} open ${count === 1 ? 'role' : 'roles'}`;
const formatRoleOpenings = (count) => {
  if (!Number.isFinite(count)) return 'Browse matching jobs';
  return `${count} open ${count === 1 ? 'job' : 'jobs'}`;
};

const normalizeLogoUrl = (logo = '') => {
  return resolveAssetUrl(logo);
};

const normalizeCompanyCards = (companies = []) => companies
  .filter((company) => company?.name)
  .slice(0, 8)
  .map((company, index) => {
    const name = company.name.trim();
    const count = Number(company.current_opening_jobs_count || 0);

    return {
      id: company.id,
      name,
      description: company.company_description || company.description || company.industry?.name || 'Actively hiring across full-time and gig roles.',
      logo: getInitials(name),
      logoUrl: normalizeLogoUrl(company.logo),
      count,
      jobs: formatOpenRoles(count),
      tone: COMPANY_TONES[index % COMPANY_TONES.length]
    };
  });

const mergeWithFallbackCompanies = (companies) => {
  if (!companies.length) return FALLBACK_COMPANIES;

  const seen = new Set(companies.map((company) => company.name.toLowerCase()));
  const fallback = FALLBACK_COMPANIES.filter((company) => !seen.has(company.name.toLowerCase()));

  return [...companies, ...fallback].slice(0, 8);
};

const normalizeRoleCards = (categories = []) => categories
  .flatMap((category) => {
    const categoryId = Number(category.id);
    const shared = {
      categoryId,
      categoryName: category.name || 'Job category',
      industryName: category.industry?.name || 'Multiple industries',
    };
    const roles = (category.roles || [])
      .filter((role) => Number(role.job_count) > 0)
      .map((role) => ({
        ...shared,
        key: `role-${role.id}`,
        roleId: Number(role.id),
        name: role.name,
        jobCount: Number(role.job_count) || 0,
        normalJobCount: Number(role.normal_job_count) || 0,
        gigJobCount: Number(role.gig_job_count) || 0,
      }));
    const unassignedCount = Number(category.unassigned_role_job_count) || 0;

    if (unassignedCount > 0) {
      roles.push({
        ...shared,
        key: `category-${category.id}`,
        roleId: null,
        name: category.name,
        jobCount: unassignedCount,
        normalJobCount: 0,
        gigJobCount: unassignedCount,
      });
    }

    return roles;
  })
  .sort((a, b) => (
    b.jobCount - a.jobCount
    || b.normalJobCount - a.normalJobCount
    || a.name.localeCompare(b.name)
  ))
  .slice(0, 12);

const Home = () => {
  const [roleCards, setRoleCards] = useState([]);
  const [roleTotals, setRoleTotals] = useState(null);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [companies, setCompanies] = useState(FALLBACK_COMPANIES);

  const displayRoles = roleCards.length > 0 ? roleCards : FALLBACK_ROLE_CARDS;

  useEffect(() => {
    let ignore = false;

    optionalAuthApiRequest('/api/job-categories/with-job-counts?status=active%2Cpublished&include_gigs=true')
      .then((response) => {
        if (!ignore && response.success && Array.isArray(response.job_categories)) {
          setRoleCards(normalizeRoleCards(response.job_categories));
          setRoleTotals(response.totals || null);
        }
      })
      .catch(() => {
        if (!ignore) {
          setRoleCards([]);
          setRoleTotals(null);
        }
      })
      .finally(() => {
        if (!ignore) setRolesLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadCompanies = async () => {
      const result = await optionalAuthApiRequest('/api/companies');
      if (ignore) return;
      setCompanies(
        mergeWithFallbackCompanies(
          normalizeCompanyCards(result.companies || [])
        )
      );
    };

    loadCompanies().catch(() => {
      if (!ignore) setCompanies(FALLBACK_COMPANIES);
    });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <>
      <HeroSection />

      <section className="home-discovery-section companies-section">
        <div className="container discovery-container">
          <div className="discovery-heading">
            <span>Companies hiring now</span>
            <h2>Job openings in top companies</h2>
            <p>Explore verified employers and jump straight into matching jobs.</p>
          </div>

          <div className="company-scroll" aria-label="Top companies">
            {companies.map((company) => (
              <article className="company-tile" key={company.name}>
                <div className={`company-mark ${company.tone}`}>
                  {company.logoUrl && (
                    <img
                      src={company.logoUrl}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                        event.currentTarget.nextElementSibling?.style.removeProperty('display');
                      }}
                    />
                  )}
                  <span className={company.logoUrl ? 'company-mark-fallback' : ''}>{company.logo}</span>
                </div>
                <div>
                  <h3>{company.name}</h3>
                  <p>{company.description}</p>
                </div>
                <div className="company-tile-footer">
                  <span>{company.jobs}</span>
                  <Link to={companyJobsUrl(company)}>View jobs</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-discovery-section roles-section">
        <div className="container discovery-container">
          <div className="discovery-heading is-centered">
            <span>Live opportunities</span>
            <h2>Popular roles hiring right now</h2>
            <p>Explore real openings across standard jobs and flexible gigs, updated from the live marketplace.</p>
          </div>

          {roleTotals && (
            <div className="roles-summary" aria-label="Live jobs summary">
              <div><strong>{roleTotals.jobs || 0}</strong><span>Total openings</span></div>
              <div><strong>{roleTotals.normal_jobs || 0}</strong><span>Standard jobs</span></div>
              <div><strong>{roleTotals.gig_jobs || 0}</strong><span>Gig opportunities</span></div>
              <div><strong>{roleTotals.categories || 0}</strong><span>Job categories</span></div>
            </div>
          )}

          {rolesLoading ? (
            <div className="roles-grid" aria-label="Loading job roles">
              {Array.from({ length: 8 }).map((_, index) => (
                <div className="role-tile-skeleton" key={index}></div>
              ))}
            </div>
          ) : (
            <div className="roles-grid">
              {displayRoles.map((role) => (
                <Link className="role-tile" to={roleJobsUrl(role)} key={role.key}>
                  <span className="role-icon">{getInitials(role.name)}</span>
                  <span className="role-copy">
                    <small title={role.industryName}>{role.categoryName}</small>
                    <strong>{role.name}</strong>
                    <em>{formatRoleOpenings(role.jobCount)}</em>
                  </span>
                  <span className="role-source-split" aria-label="Job type counts">
                    {Number.isFinite(role.normalJobCount) && role.normalJobCount > 0 && (
                      <span>{role.normalJobCount} {role.normalJobCount === 1 ? 'Job' : 'Jobs'}</span>
                    )}
                    {Number.isFinite(role.gigJobCount) && role.gigJobCount > 0 && (
                      <span>{role.gigJobCount} {role.gigJobCount === 1 ? 'Gig' : 'Gigs'}</span>
                    )}
                  </span>
                  <svg className="role-arrow" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m9 18 6-6-6-6"></path>
                  </svg>
                </Link>
              ))}
            </div>
          )}

          <Link className="roles-view-all" to="/jobs">
            View all opportunities
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
          </Link>
        </div>
      </section>
    </>
  );
};

export default Home;

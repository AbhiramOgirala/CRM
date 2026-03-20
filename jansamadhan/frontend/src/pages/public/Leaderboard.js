import React, { useState, useEffect } from 'react';
import { leaderboardAPI, locationAPI } from '../../services/api';

const CITIZEN_BADGE_ICONS = { newcomer:'🌱', contributor:'⭐', active_citizen:'🏆', champion:'🎖️', civic_hero:'🦸' };
const GOVT_BADGE_ICONS = { new_officer:'🔰', active_officer:'⚙️', efficient_officer:'🌟', star_officer:'💫', excellence_award:'🏅' };

const medalEmoji = (i) => ['🥇','🥈','🥉'][i] ?? null;
const medalBg = (i) => ['#FFF8DC','#F5F5F5','#FFF3E0'][i] ?? 'white';
const medalBorder = (i) => ['#FFD700','#C0C0C0','#CD7F32'][i] ?? '#E0E3EF';

function RankCard({ item, rank, primary, secondary, badge, badgeMap, extra }) {
  const i = rank - 1;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px',
      background: medalBg(i),
      border: `1px solid ${medalBorder(i)}`,
      borderLeft: `5px solid ${medalBorder(i)}`,
      borderRadius: 'var(--radius)', marginBottom: 8,
      boxShadow: i < 3 ? '0 2px 12px rgba(0,0,0,0.08)' : 'var(--shadow)',
      transition: 'transform 0.15s',
    }}
      onMouseOver={e => e.currentTarget.style.transform='translateY(-1px)'}
      onMouseOut={e => e.currentTarget.style.transform='translateY(0)'}
    >
      {/* Rank */}
      <div style={{
        minWidth: 38, height: 38, borderRadius: '50%',
        background: medalBorder(i), color: i < 3 ? 'white' : 'var(--text-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: i < 3 ? '1.1rem' : '0.85rem', flexShrink: 0
      }}>
        {medalEmoji(i) ?? `#${rank}`}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {primary}
        </div>
        {secondary && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{secondary}</div>}
        {extra && <div style={{ marginTop: 4 }}>{extra}</div>}
      </div>

      {/* Badge */}
      {badge && badgeMap && (
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: '1.4rem' }}>{badgeMap[badge] || '🌱'}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {badge?.replace(/_/g, ' ')}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Leaderboard() {
  const [tab, setTab] = useState('citizens');
  const [citizens, setCitizens] = useState([]);
  const [depts, setDepts] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [areaData, setAreaData] = useState([]);
  const [districtData, setDistrictData] = useState([]);
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    locationAPI.getStates().then(r => setStates(r.states || []));
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = selectedState ? { state_id: selectedState } : {};
        const [c, d, o, a, dist] = await Promise.all([
          leaderboardAPI.getCitizens({ limit: 20, ...params }),
          leaderboardAPI.getDepts(),
          leaderboardAPI.getOfficers(params),
          leaderboardAPI.getArea(params),
          leaderboardAPI.getDistrict(params)
        ]);
        setCitizens(c.leaderboard || []);
        setDepts(d.leaderboard || []);
        setOfficers(o.leaderboard || []);
        setAreaData(a.leaderboard || []);
        setDistrictData(dist.leaderboard || []);
      } catch (err) {
        console.error('Leaderboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedState]);

  const TABS = [
    { key: 'citizens',   label: '👥 Citizens',    count: citizens.length },
    { key: 'officers',   label: '👮 Officers',    count: officers.length },
    { key: 'departments',label: '🏢 Departments', count: depts.length },
    { key: 'area',       label: '📍 Area-wise',   count: areaData.length },
    { key: 'district',   label: '🏙️ District-wise', count: districtData.length },
  ];

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏆 Leaderboard</h1>
          <p className="page-subtitle">Rankings across all levels — citizens, officers, departments & regions</p>
        </div>
        <select className="form-control" style={{ width: 200 }} value={selectedState}
          onChange={e => setSelectedState(e.target.value)}>
          <option value="">🇮🇳 All India</option>
          {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Info banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1A237E, #283593)',
        borderRadius: 'var(--radius)', padding: '14px 20px', marginBottom: 20,
        color: 'white', fontSize: '0.875rem', display: 'flex', gap: 20, flexWrap: 'wrap'
      }}>
        <div>🌱 <strong>Citizens</strong> earn points for filing, upvotes, resolutions</div>
        <div>🏅 <strong>Officers</strong> earn points per complaint resolved (priority-based)</div>
        <div>🏢 <strong>Departments</strong> ranked monthly by resolution rate</div>
        <div>📍 <strong>Area/District</strong> — inter-level competition for best performance</div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
            {t.count > 0 && <span style={{ marginLeft: 6, background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 10, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 72 }} />)}
        </div>
      ) : (
        <>
          {/* ── Citizens ──────────────────────────────────────────── */}
          {tab === 'citizens' && (
            <div>
              <div style={{ background: 'var(--secondary-light)', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: '0.82rem', color: 'var(--secondary)', fontWeight: 600 }}>
                🌱 Points: File complaint +10 • Upvote received +2 • Complaint resolved +5 • Duplicate verified +3
              </div>
              {citizens.length === 0
                ? <div className="card"><div className="empty-state"><div className="empty-state-icon">👥</div><p className="empty-state-title">No citizen data yet</p></div></div>
                : citizens.map((c, i) => (
                  <RankCard key={c.user_id} rank={i+1}
                    primary={c.users?.full_name || 'Citizen'}
                    secondary={`📋 ${c.total_complaints || 0} complaints filed`}
                    badge={c.badge}
                    badgeMap={CITIZEN_BADGE_ICONS}
                    extra={
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ background: '#E8EAF6', color: '#3949AB', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                          ⭐ {c.points || 0} pts
                        </span>
                      </div>
                    }
                  />
                ))
              }
            </div>
          )}

          {/* ── Officers ─────────────────────────────────────────── */}
          {tab === 'officers' && (
            <div>
              <div style={{ background: '#E8F5E9', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: '0.82rem', color: '#2E7D32', fontWeight: 600 }}>
                🏅 Points: Critical resolved +25 • High +20 • Medium +15 • Low +10 • Within SLA bonus +10
              </div>
              {officers.length === 0
                ? <div className="card"><div className="empty-state"><div className="empty-state-icon">👮</div><p className="empty-state-title">No officer data yet</p></div></div>
                : officers.map((o, i) => (
                  <RankCard key={o.id} rank={i+1}
                    primary={o.full_name}
                    secondary={`${o.departments?.name || 'Unknown Dept'} • ✅ ${o.complaints_resolved || 0} resolved`}
                    badge={o.govt_badge}
                    badgeMap={GOVT_BADGE_ICONS}
                    extra={
                      <span style={{ background: '#E8F5E9', color: '#2E7D32', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                        🏅 {o.govt_points || 0} pts
                      </span>
                    }
                  />
                ))
              }
            </div>
          )}

          {/* ── Departments ───────────────────────────────────────── */}
          {tab === 'departments' && (
            <div>
              <div style={{ background: '#FFF8E1', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: '0.82rem', color: '#E65100', fontWeight: 600 }}>
                🏢 Monthly ranking — departments compete based on number of complaints resolved and SLA compliance
              </div>
              {depts.length === 0
                ? <div className="card"><div className="empty-state"><div className="empty-state-icon">🏢</div><p className="empty-state-title">No department data yet for this month</p></div></div>
                : depts.map((d, i) => (
                  <RankCard key={d.department_id} rank={i+1}
                    primary={d.departments?.name || 'Unknown'}
                    secondary={`✅ ${d.complaints_resolved || 0} resolved this month`}
                    extra={
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ background: '#FFF8E1', color: '#E65100', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                          🏅 {d.points_earned || 0} pts
                        </span>
                      </div>
                    }
                  />
                ))
              }
            </div>
          )}

          {/* ── Area-wise (Mandal level) ───────────────────────────── */}
          {tab === 'area' && (
            <div>
              <div style={{ background: '#E8EAF6', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: '0.82rem', color: '#3949AB', fontWeight: 600 }}>
                📍 Area-level competition — Mandals/Localities ranked by complaints resolved (e.g., Kukatpally vs Nizampet vs Bachupally)
              </div>
              {areaData.length === 0
                ? (
                  <div className="card">
                    <div className="empty-state">
                      <div className="empty-state-icon">📍</div>
                      <p className="empty-state-title">No area data yet</p>
                      <p className="empty-state-desc">Area rankings appear once complaints are filed with mandal location and resolved.</p>
                    </div>
                  </div>
                )
                : areaData.map((a, i) => (
                  <RankCard key={a.mandal_id || i} rank={i+1}
                    primary={a.name}
                    secondary={`${a.district ? `${a.district} • ` : ''}✅ ${a.resolved || 0} issues resolved`}
                    extra={
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ background: '#E8EAF6', color: '#3949AB', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                          🏅 {a.points || 0} pts
                        </span>
                        {a.resolution_rate && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {a.resolution_rate}% resolution rate
                          </span>
                        )}
                      </div>
                    }
                  />
                ))
              }
            </div>
          )}

          {/* ── District-wise ─────────────────────────────────────── */}
          {tab === 'district' && (
            <div>
              <div style={{ background: '#FCE4EC', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: '0.82rem', color: '#C2185B', fontWeight: 600 }}>
                🏙️ District-level competition — Districts ranked by total points (Hyderabad vs Warangal vs Nizamabad etc.)
              </div>
              {districtData.length === 0
                ? (
                  <div className="card">
                    <div className="empty-state">
                      <div className="empty-state-icon">🏙️</div>
                      <p className="empty-state-title">No district data yet</p>
                      <p className="empty-state-desc">District rankings populate once complaints are filed and resolved with district location.</p>
                    </div>
                  </div>
                )
                : districtData.map((d, i) => {
                  const barWidth = Math.min((d.resolution_rate || 0), 100);
                  return (
                    <div key={d.district_id || i} style={{
                      padding: '16px 18px',
                      background: medalBg(i),
                      border: `1px solid ${medalBorder(i)}`,
                      borderLeft: `5px solid ${medalBorder(i)}`,
                      borderRadius: 'var(--radius)', marginBottom: 10,
                      boxShadow: 'var(--shadow)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <div style={{
                          minWidth: 36, height: 36, borderRadius: '50%', background: medalBorder(i),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: i < 3 ? '1rem' : '0.82rem', color: i < 3 ? 'white' : 'var(--text-muted)'
                        }}>
                          {medalEmoji(i) ?? `#${i+1}`}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: '1rem' }}>{d.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{d.state}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: '#C2185B' }}>
                            {d.points || 0}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>points</div>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', marginBottom: 8, flexWrap: 'wrap' }}>
                        <span>📋 Total: <strong>{d.total}</strong></span>
                        <span>✅ Resolved: <strong>{d.resolved}</strong></span>
                        <span>🔴 Critical: <strong>{d.critical_resolved || 0}</strong></span>
                        <span>📈 Rate: <strong style={{ color: d.resolution_rate >= 70 ? '#2E7D32' : d.resolution_rate >= 40 ? '#E65100' : '#C62828' }}>{d.resolution_rate}%</strong></span>
                      </div>

                      {/* Resolution rate bar */}
                      <div style={{ background: 'rgba(0,0,0,0.08)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 4,
                          width: `${barWidth}%`,
                          background: d.resolution_rate >= 70 ? '#2E7D32' : d.resolution_rate >= 40 ? '#E65100' : '#C62828',
                          transition: 'width 1s ease'
                        }} />
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}
        </>
      )}
    </div>
  );
}

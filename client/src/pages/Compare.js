import React from 'react';
import { useCompare } from '../contexts/CompareContext';
import { Link, useNavigate } from 'react-router-dom';
import './Compare.css';

// Helper to prettify keys
const formatKey = (key) => {
  return key
    .replace(/compatibility\./,'')
    .replace(/([a-z])([A-Z])/g,'$1 $2')
    .replace(/_/g,' ')
    .replace(/^./, c => c.toUpperCase());
};

const Compare = () => {
  const { compareItems, removeFromCompare, clearCompare, max } = useCompare();
  const navigate = useNavigate();

  const filled = [...compareItems];
  while (filled.length < max) filled.push(null);

  const hasAny = compareItems.length > 0;

  // Build union of all spec keys across compared products
  let unionKeys = [];
  if (compareItems.length) {
    const coreFields = ['brand','category','model','price','stock','weight'];
    const set = new Set();
    compareItems.forEach(p => {
      if (!p || p.loading) return;
      // core
      coreFields.forEach(k => { if (p[k] !== undefined) set.add(k); });
      // warranty
      if (p.warranty && (p.warranty.duration || p.warranty.type)) set.add('warranty');
      // plain specifications Map/object
      if (p.specifications && typeof p.specifications === 'object') {
        Object.keys(p.specifications).forEach(k => set.add(k));
      }
      // detailed specs by category
      if (p.detailedSpecs && p.category) {
        const categoryMap = {
          'CPU': 'cpu','GPU':'gpu','Motherboard':'motherboard','RAM':'ram','Storage':'storage','Power Supply':'powerSupply','Case':'case','Cooling':'cooling','Monitor':'monitor','Keyboard':'keyboard','Mouse':'mouse','Headset':'headset','Speakers':'speakers','Webcam':'webcam'
        };
        const key = categoryMap[p.category];
        if (key && p.detailedSpecs[key]) {
          Object.keys(p.detailedSpecs[key]).forEach(k => set.add(k));
        }
      }
      // compatibility flatten
      if (p.compatibility && typeof p.compatibility === 'object') {
        Object.entries(p.compatibility).forEach(([k,v]) => {
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            Object.entries(v).forEach(([ck,cv]) => { if (cv !== undefined) set.add(`compatibility.${ck}`); });
          } else if (v !== undefined) set.add(`compatibility.${k}`);
        });
      }
    });
    // Preserve core order first, then rest alphabetically
    const coreOrdered = []; coreFields.forEach(k => { if (set.has(k)) { coreOrdered.push(k); set.delete(k); } });
    if (set.has('warranty')) { coreOrdered.push('warranty'); set.delete('warranty'); }
    const remaining = Array.from(set).sort((a,b) => a.localeCompare(b));
    unionKeys = [...coreOrdered, ...remaining];
  }

  return (
    <div className="container compare-page">
      <div className="compare-header">
        <h1>Product Comparison</h1>
        <div className="actions">
          {hasAny && <button className="btn btn-outline" onClick={clearCompare}>Clear All</button>}
          <button className="btn btn-primary" onClick={() => navigate('/products')}>Add More</button>
        </div>
      </div>

      {!hasAny && (
        <div className="empty-state">
          <p>No products selected for comparison.</p>
          <Link to="/products" className="btn btn-primary">Browse Products</Link>
        </div>
      )}

      {hasAny && (
        <div className="compare-grid">
          {filled.map((p,i) => (
            <div key={i} className={`compare-slot ${p ? '' : 'empty'}`}>
              {p ? (
                <div className="compare-card">
                  <div className="card-head">
                    <button className="remove" onClick={() => removeFromCompare(p._id)} title="Remove">✕</button>
                  </div>
                  <div className="img-wrap">
                    {p.images && p.images[0] ? (
                      <img src={p.images[0].url || p.images[0]} alt={p.name} onError={e=>{e.target.src='/placeholder-product.jpg';}} />
                    ) : (
                      <div className="no-img">📦</div>
                    )}
                  </div>
                  <h3 className="name" title={p.name}>{p.name}</h3>
                  <div className="price-line">
                    <span className="price">${p.price?.toFixed ? p.price.toFixed(2) : p.price}</span>
                    {p.originalPrice && p.originalPrice > p.price && (
                      <span className="orig">${p.originalPrice.toFixed(2)}</span>
                    )}
                  </div>
                  <div className={`stock ${p.stock>0?'in':'out'}`}>{p.stock>0?`${p.stock} in stock`:'Out of stock'}</div>
                  <Link to={`/products/${p._id}`} className="view-link">Details →</Link>
                </div>
              ) : (
                <div
                  className="placeholder add-placeholder"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate('/products')}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate('/products'); }}
                  title="Click to browse products to compare"
                >
                  <span>Add product</span>
                  <small className="hint">Click to browse</small>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {hasAny && (
        <div className="spec-compare">
          <table>
            <thead>
              <tr>
                <th>Specification ({unionKeys.length + 1})</th>
                {compareItems.map(p => <th key={p._id}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {unionKeys.map(key => {
                return (
                  <tr key={key}>
                    <td className="k">{formatKey(key)}</td>
                    {compareItems.map(p => {
                      if (!p || p.loading) return <td key={p?._id || Math.random()}>Loading…</td>;
                      let value;
                      if (key === 'warranty') {
                        value = p.warranty ? [p.warranty.duration, p.warranty.type].filter(Boolean).join(' ') : undefined;
                      } else if (key.startsWith('compatibility.')) {
                        const sub = key.split('.')[1];
                        value = p.compatibility && p.compatibility[sub] !== undefined ? p.compatibility[sub] : undefined;
                        if (typeof value === 'object' && value !== null) value = JSON.stringify(value);
                      } else if (p[key] !== undefined) {
                        value = key === 'price' ? `$${p[key]}` : p[key];
                      } else {
                        // check specifications map
                        if (p.specifications && p.specifications[key] !== undefined) value = p.specifications[key];
                        else if (p.detailedSpecs && p.category) {
                          const categoryMap = {
                            'CPU': 'cpu','GPU':'gpu','Motherboard':'motherboard','RAM':'ram','Storage':'storage','Power Supply':'powerSupply','Case':'case','Cooling':'cooling','Monitor':'monitor','Keyboard':'keyboard','Mouse':'mouse','Headset':'headset','Speakers':'speakers','Webcam':'webcam'
                          };
                          const ck = categoryMap[p.category];
                          if (ck && p.detailedSpecs[ck] && p.detailedSpecs[ck][key] !== undefined) value = p.detailedSpecs[ck][key];
                        }
                      }
                      return <td key={p._id} className="v">{value !== undefined && value !== '' ? value : '—'}</td>;
                    })}
                  </tr>
                );
              })}
              <tr>
                <td className="k">Rating</td>
                {compareItems.map(p => <td key={p._id}>{p.ratings?.average ? p.ratings.average.toFixed(1) : '—'}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Compare;

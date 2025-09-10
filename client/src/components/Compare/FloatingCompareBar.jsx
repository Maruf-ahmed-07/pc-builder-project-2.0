import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompare } from '../../contexts/CompareContext';
import './FloatingCompareBar.css';

const FloatingCompareBar = () => {
  const { compareItems, clearCompare, removeFromCompare, max } = useCompare();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [recentlyAddedId, setRecentlyAddedId] = useState(null);

  useEffect(() => {
    if (compareItems.length) {
      setExpanded(true);
    } else {
      setExpanded(false);
    }
  }, [compareItems.length]);

  useEffect(() => {
    if (compareItems.length) {
      const last = compareItems[compareItems.length - 1]._id;
      setRecentlyAddedId(last);
      const t = setTimeout(() => setRecentlyAddedId(null), 1500);
      return () => clearTimeout(t);
    }
  }, [compareItems]);

  if (!compareItems.length) return null;

  return (
    <div className={`floating-compare ${expanded ? 'expanded' : ''}`}>
      <button
        className="toggle"
        onClick={() => setExpanded(e => !e)}
        aria-label={expanded ? 'Collapse compare bar' : 'Expand compare bar'}
      >
        {expanded ? '×' : `${compareItems.length}/${max}`}
      </button>
      <div className="content">
        <div className="thumbs">
          {compareItems.map(p => (
            <div key={p._id} className={`thumb ${recentlyAddedId === p._id ? 'pulse' : ''}`}> 
              {p.images && p.images[0] ? (
                <img src={p.images[0].url || p.images[0]} alt={p.name} onError={e=>{e.target.src='/placeholder-product.jpg';}} />
              ) : <span className="placeholder">📦</span>}
              <button className="rm" onClick={() => removeFromCompare(p._id)} title="Remove">✕</button>
            </div>
          ))}
          {compareItems.length < max && (
            <div className="slot">{compareItems.length}/{max}</div>
          )}
        </div>
        <div className="actions">
          <button className="btn-mini ghost" onClick={clearCompare}>Clear</button>
          <button className="btn-mini primary" onClick={() => navigate('/compare')}>Compare Now →</button>
        </div>
      </div>
    </div>
  );
};

export default FloatingCompareBar;

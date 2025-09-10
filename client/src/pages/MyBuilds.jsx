import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import './MyBuilds.css';

const MyBuilds = () => {
  const { user, isAuthenticated } = useAuth();
  // Pull in addToCart from cart context
  const { addToCart } = useCart();
  const [builds, setBuilds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBuild, setSelectedBuild] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editBuildName, setEditBuildName] = useState('');
  const [editBuildDescription, setEditBuildDescription] = useState('');

  const fetchUserBuilds = useCallback(async () => {
    console.log('fetchUserBuilds called, isAuthenticated:', isAuthenticated, 'user:', user);
    try {
      setIsLoading(true);
      console.log('Making API call to /api/builds/user');
      const response = await axios.get('/api/builds/user');
      console.log('API response:', response.data);
      setBuilds(response.data.builds || []);
    } catch (error) {
      console.error('Error fetching builds:', error);
      toast.error('Failed to load your builds');
    } finally {
      setIsLoading(false);
    }
  // fetch depends on auth state
  }, [isAuthenticated]);
  useEffect(() => {
    if (isAuthenticated) {
      fetchUserBuilds();
    }
  }, [isAuthenticated, fetchUserBuilds]);

  const deleteBuild = async (buildId) => {
    if (!window.confirm('Are you sure you want to delete this build? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/api/builds/${buildId}`);
      setBuilds(builds.filter(build => build._id !== buildId));
      toast.success('Build deleted successfully');
    } catch (error) {
      console.error('Error deleting build:', error);
      toast.error('Failed to delete build');
    }
  };

  const handleEditBuild = (build) => {
    setSelectedBuild(build);
    setEditBuildName(build.name);
    setEditBuildDescription(build.description || '');
    setShowEditModal(true);
  };

  const saveEditedBuild = async () => {
    if (!editBuildName.trim()) {
      toast.error('Please enter a build name');
      return;
    }

    try {
      const updatedBuild = {
        ...selectedBuild,
        name: editBuildName.trim(),
        description: editBuildDescription.trim(),
        updatedAt: new Date().toISOString()
      };

      await axios.put(`/api/builds/${selectedBuild._id}`, updatedBuild);
      
      setBuilds(builds.map(build => 
        build._id === selectedBuild._id ? updatedBuild : build
      ));
      
      toast.success('Build updated successfully');
      setShowEditModal(false);
      resetEditModal();
    } catch (error) {
      console.error('Error updating build:', error);
      toast.error('Failed to update build');
    }
  };

  const resetEditModal = () => {
    setSelectedBuild(null);
    setEditBuildName('');
    setEditBuildDescription('');
  };

  const handleViewBuild = (build) => {
    setSelectedBuild(build);
    setShowViewModal(true);
  };

  const handleShareBuild = (build) => {
    setSelectedBuild(build);
    setShowShareModal(true);
  };

  const shareToCommunity = async () => {
    try {
      const shareData = {
        buildId: selectedBuild._id,
        name: selectedBuild.name,
        description: selectedBuild.description,
        components: selectedBuild.components,
        totalPrice: selectedBuild.totalPrice,
        createdBy: user.name || user.email,
        isPublic: true
      };

      await axios.post('/api/community/builds', shareData);
      toast.success('Build shared to community successfully!');
      setShowShareModal(false);
    } catch (error) {
      console.error('Error sharing build:', error);
      toast.error('Failed to share build to community');
    }
  };

  const addBuildToCart = async (build) => {
    if (!build) {
      toast.error('Build not found');
      return;
    }
    const rawComponents = Object.values(build.components || {});
    if (rawComponents.length === 0) {
      toast.error('No components to add');
      return;
    }

    // Collect unique product IDs (handles various stored shapes)
    const productIds = [];
    for (const comp of rawComponents) {
      if (!comp) continue;
      // Possible shapes: { product: {_id,...} } | { product: 'id' } | direct product obj {_id,...}
      let pid = null;
      if (comp.product) {
        if (typeof comp.product === 'string') pid = comp.product; else pid = comp.product._id;
      } else if (comp._id) {
        pid = comp._id;
      }
      if (pid && !productIds.includes(pid)) productIds.push(pid);
    }

    if (productIds.length === 0) {
      toast.error('No valid products found in build');
      return;
    }

    let successCount = 0;
    let failCount = 0;
    for (const pid of productIds) {
      // Ensure it looks like a Mongo ObjectId (24 hex) before calling API
      if (!/^[a-fA-F0-9]{24}$/.test(pid)) { failCount++; continue; }
      const res = await addToCart(pid, 1, { silent: true });
      if (res.success) successCount++; else failCount++;
    }

    if (successCount > 0) {
      toast.success(`${successCount} component${successCount>1?'s':''} from "${build.name}" added to cart` + (failCount ? ` (${failCount} skipped)` : '')); 
    } else {
      toast.error('Could not add components to cart');
    }
  };

  const copyShareLink = () => {
    const shareLink = `${window.location.origin}/build/${selectedBuild._id}`;
    navigator.clipboard.writeText(shareLink);
    toast.success('Share link copied to clipboard!');
  };

  if (!isAuthenticated) {
    return (
      <div className="my-builds-page">
        <div className="container">
          <div className="auth-required">
            <h2>Login Required</h2>
            <p>Please log in to view your saved builds.</p>
            <button className="btn btn-primary" onClick={() => window.location.href = '/login'}>
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-builds-page">
      <div className="container">
        {/* Page Header */}
        <div className="page-header">
          <h1>My Builds</h1>
          <p>Manage your saved PC builds - edit, delete, view, and share with the community</p>
          <div className="header-actions">
            <button 
              className="btn btn-primary"
              onClick={() => window.location.href = '/pc-builder'}
            >
              Create New Build
            </button>
          </div>
        </div>

        {/* Builds Content */}
        {isLoading ? (
          <div className="loading-section">
            <div className="loading-spinner">
              <p>Loading...</p>
            </div>
          </div>
        ) : builds.length === 0 ? (
          <div className="no-builds">
            <div className="no-builds-content">
              <h3>No Builds Yet</h3>
              <p>You haven't saved any builds yet. Start building your dream PC!</p>
              <button 
                className="btn btn-primary"
                onClick={() => window.location.href = '/pc-builder'}
              >
                Build Your First PC
              </button>
            </div>
          </div>
        ) : (
          <div className="builds-grid">
            {builds.map(build => (
              <div key={build._id} className="build-card">
                <div className="build-header minimal">
                  <h3 className="build-name">{build.name}</h3>
                  <div className="build-meta-row">
                    <span className="build-date">{new Date(build.createdAt).toLocaleDateString()}</span>
                    <span className="build-components-count">{Object.keys(build.components || {}).length} parts</span>
                    {build.totalPrice ? <span className="build-price-tag">${build.totalPrice.toFixed(0)}</span> : null}
                  </div>
                </div>
                <div className="build-visual-wrapper">
                  <RealisticPCVisualization components={build.components || {}} name={build.name} />
                </div>
                <div className="build-actions-bar">
                  <button title="View" className="action-btn view" onClick={() => handleViewBuild(build)}>👁</button>
                  <button title="Edit" className="action-btn edit" onClick={() => handleEditBuild(build)}>✏️</button>
                  <button title="Add to Cart" className="action-btn cart" onClick={() => addBuildToCart(build)}>🛒</button>
                  <button title="Share" className="action-btn share" onClick={() => handleShareBuild(build)}>🔗</button>
                  <button title="Delete" className="action-btn delete" onClick={() => deleteBuild(build._id)}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedBuild && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Edit Build</h3>
                <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="editBuildName">Build Name *</label>
                  <input
                    type="text"
                    id="editBuildName"
                    value={editBuildName}
                    onChange={(e) => setEditBuildName(e.target.value)}
                    placeholder="Enter a name for your build..."
                    maxLength={100}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editBuildDescription">Description (Optional)</label>
                  <textarea
                    id="editBuildDescription"
                    value={editBuildDescription}
                    onChange={(e) => setEditBuildDescription(e.target.value)}
                    placeholder="Describe your build, its purpose, or any special features..."
                    rows={4}
                    maxLength={500}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={saveEditedBuild}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal && selectedBuild && (
          <div className="modal-overlay">
            <div className="modal modal-large">
              <div className="modal-header">
                <h3>{selectedBuild.name}</h3>
                <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
              </div>
              <div className="modal-body">
                {selectedBuild.description ? (
                  <div className="build-description-full">
                    <h4>Description</h4>
                    <p>{selectedBuild.description}</p>
                  </div>
                ) : null}
                <div className="build-details">
                  <h4>Components</h4>
                  <div className="components-detailed">
                    {Object.entries(selectedBuild.components).map(([category, component]) => (
                      <div key={category} className="component-detailed">
                        <div className="component-header">
                          <strong>{category}</strong>
                          <span className="component-price">${component?.price || component?.product?.price || '0.00'}</span>
                        </div>
                        <div className="component-info">
                          <div className="component-name">{component?.product?.name || component?.name || 'Unknown Component'}</div>
                          {(component?.brand || component?.product?.brand) ? (
                            <div className="component-brand">{component?.brand || component?.product?.brand}</div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="build-total-detailed">
                    <strong>Total Price: ${selectedBuild.totalPrice?.toFixed(2) || '0.00'}</strong>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>
                  Close
                </button>
                <button className="btn btn-primary" onClick={() => addBuildToCart(selectedBuild)}>
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && selectedBuild && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Share Build</h3>
                <button className="modal-close" onClick={() => setShowShareModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="share-options">
                  <div className="share-option">
                    <h4>Share to Community</h4>
                    <p>Make your build public for others to see and get inspired by.</p>
                    <button className="btn btn-primary" onClick={shareToCommunity}>
                      Share to Community
                    </button>
                  </div>
                  <div className="share-divider">OR</div>
                  <div className="share-option">
                    <h4>Copy Share Link</h4>
                    <p>Share a direct link to this build with your friends.</p>
                    <button className="btn btn-secondary" onClick={copyShareLink}>
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowShareModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
/* ---------------- Mini PC Visualization (light theme friendly) ---------------- */
const matchType = (key) => {
  if (!key) return key;
  const k = key.toLowerCase();
  if (k.includes('mother')) return 'motherboard';
  if (k.includes('cpu') || k.includes('processor')) return 'cpu';
  if (k.includes('cool') || k.includes('aio')) return 'cooler';
  if (k.includes('ram') || k.includes('memory')) return 'ram';
  if (k.includes('gpu') || k.includes('graphics') || k.includes('video')) return 'gpu';
  if (k.includes('psu') || k.includes('power')) return 'psu';
  if (k.includes('case') || k.includes('chassis')) return 'case';
  if (k.includes('ssd') || k.includes('nvme') || k.includes('hdd') || k.includes('storage') || k.includes('drive')) return 'storage';
  if (k.includes('monitor') || k.includes('display')) return 'monitor';
  if (k.includes('keyboard')) return 'keyboard';
  if (k.includes('mouse')) return 'mouse';
  if (k.includes('headset') || k.includes('headphone')) return 'headset';
  if (k.includes('speaker')) return 'speakers';
  return k;
};

const RealisticPCVisualization = ({ components = {}, name }) => {
  const slots = {
    case: null,
    motherboard: null,
    cpu: null,
    cooler: null,
    ram: null,
    gpu: null,
    storage: null,
    psu: null,
    monitor: null,
    keyboard: null,
    mouse: null,
    headset: null,
    speakers: null
  };
  Object.entries(components || {}).forEach(([rawKey, comp]) => {
    const t = matchType(rawKey);
    if (t in slots && !slots[t]) slots[t] = comp;
  });

  const getMeta = (comp, slot) => {
    if (!comp) return { slot, name: 'Not Selected', brand: '', price: null };
    return {
      slot,
      name: comp?.product?.name || comp?.name || 'Unknown',
      brand: comp?.product?.brand || comp?.brand || '',
      price: comp?.product?.price || comp?.price || null
    };
  };

  const [hover, setHover] = React.useState(null); // {x,y,data}
  const containerRef = React.useRef(null);

  const positionTooltip = (clientX, clientY, key) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
  const rawX = clientX - rect.left;
  const rawY = clientY - rect.top;
  const tooltipWidth = 220;
  const half = Math.min(tooltipWidth / 2, (rect.width / 2) - 8);
  const minX = half;
  const maxX = rect.width - half;
  const clampedX = Math.min(Math.max(rawX, minX), maxX);
  // Account for upward translate of ~110% (approx 120px). Keep y inside visible case.
  const minY = 70; // avoid clipping at top due to transform
  const maxY = rect.height - 55; // leave room at bottom
  const clampedY = Math.min(Math.max(rawY, minY), maxY);
  setHover({ x: clampedX, y: clampedY, data: getMeta(slots[key], key) });
  };

  const onEnter = (e, key) => {
    positionTooltip(e.clientX, e.clientY, key);
  };
  const onMove = (e, key) => {
    if (!hover) return; // only update if already shown
    positionTooltip(e.clientX, e.clientY, key);
  };
  const onLeave = () => setHover(null);

  const slotClass = (base, key) => `${base} ${slots[key] ? 'filled' : 'empty'}`;

  // Prevent parent (motherboard) hover from eclipsing child components
  const motherboardEnter = (e) => {
    if (e.target === e.currentTarget && slots.motherboard) onEnter(e,'motherboard');
  };
  const motherboardMove = (e) => {
    if (e.target === e.currentTarget && slots.motherboard) onMove(e,'motherboard');
  };

  return (
    <div className="pc-desk-setup" aria-label={`PC desk setup for ${name}`} ref={containerRef}>
      <div className="desk-background" />
      <div className="desk-surface" />
      {/* Monitor */}
      {slots.monitor && (
        <div className={slotClass('desk-monitor','monitor')}
          onMouseEnter={(e)=>onEnter(e,'monitor')} onMouseMove={(e)=>onMove(e,'monitor')} onMouseLeave={onLeave}>
          <div className="desk-monitor-screen" />
          <div className="desk-monitor-stand" />
        </div>
      )}
      {/* Tower Case */}
      <div className={`tower-case ${slots.case ? 'has-case':''}`}> 
        <div className="tower-glass" />
        <div className="tower-inner">
          {slots.motherboard || slots.cpu || slots.cooler || slots.ram || slots.gpu || slots.storage || slots.psu ? (
            <div className={slotClass('mb-area','motherboard')} onMouseEnter={motherboardEnter} onMouseMove={motherboardMove} onMouseLeave={onLeave}>
              {slots.cpu && (
                <div className={slotClass('cpu-socket','cpu')} onMouseEnter={(e)=>onEnter(e,'cpu')} onMouseMove={(e)=>onMove(e,'cpu')} onMouseLeave={onLeave}>
                  <span className="comp-label">CPU</span>
                </div>
              )}
              {slots.cooler && (
                <div className={slotClass('cooler','cooler')} onMouseEnter={(e)=>onEnter(e,'cooler')} onMouseMove={(e)=>onMove(e,'cooler')} onMouseLeave={onLeave}>
                  <div className="fan-blades" />
                  <span className="comp-label">Cooler</span>
                </div>
              )}
              {slots.ram && (
                <div className="ram-slots">
                  {[0,1].map(i => (
                    <div
                      key={i}
                      className={`ram-stick filled`}
                      onMouseEnter={i===0 ? (e)=>onEnter(e,'ram') : undefined}
                      onMouseMove={i===0 ? (e)=>onMove(e,'ram') : undefined}
                      onMouseLeave={i===0 ? onLeave : undefined}
                    />
                  ))}
                </div>
              )}
              {slots.gpu && (
                <div className={slotClass('gpu-slot','gpu')} onMouseEnter={(e)=>onEnter(e,'gpu')} onMouseMove={(e)=>onMove(e,'gpu')} onMouseLeave={onLeave}>
                  <div className="gpu-fans">
                    <div className="gpu-fan" />
                    <div className="gpu-fan" />
                  </div>
                  <span className="comp-label">GPU</span>
                </div>
              )}
              {slots.storage && (
                <div className="storage-cage">
                  <div
                    className="drive filled"
                    onMouseEnter={(e)=>onEnter(e,'storage')}
                    onMouseMove={(e)=>onMove(e,'storage')}
                    onMouseLeave={onLeave}
                  >
                    <span className="comp-label">SSD</span>
                  </div>
                </div>
              )}
              {slots.psu && (
                <div className={slotClass('psu','psu')} onMouseEnter={(e)=>onEnter(e,'psu')} onMouseMove={(e)=>onMove(e,'psu')} onMouseLeave={onLeave}>
                  <div className="psu-fan" />
                  <span className="comp-label">PSU</span>
                </div>
              )}
            </div>
          ) : <div className="empty-build-placeholder">No core components</div>}
        </div>
        {/* RGB strips */}
        <div className="tower-rgb tower-rgb-top" />
        <div className="tower-rgb tower-rgb-front" />
      </div>
      {/* Keyboard / Mouse / Headset */}
      {slots.keyboard && (
        <div className={slotClass('desk-keyboard','keyboard')} onMouseEnter={(e)=>onEnter(e,'keyboard')} onMouseMove={(e)=>onMove(e,'keyboard')} onMouseLeave={onLeave} />
      )}
      {slots.mouse && (
        <div className={slotClass('desk-mouse','mouse')} onMouseEnter={(e)=>onEnter(e,'mouse')} onMouseMove={(e)=>onMove(e,'mouse')} onMouseLeave={onLeave} />
      )}
      {slots.headset && (
        <div className={slotClass('desk-headset','headset')} onMouseEnter={(e)=>onEnter(e,'headset')} onMouseMove={(e)=>onMove(e,'headset')} onMouseLeave={onLeave} />
      )}
      {slots.speakers && (
        <div className={slotClass('desk-speakers','speakers')} onMouseEnter={(e)=>onEnter(e,'speakers')} onMouseMove={(e)=>onMove(e,'speakers')} onMouseLeave={onLeave} />
      )}
      {hover && (
        <div className="pc-hover-tooltip desk" style={{left: hover.x, top: hover.y}}>
          <div className="slot-label">{hover.data.slot.toUpperCase()}</div>
          <div className="slot-name">{hover.data.name}</div>
          {hover.data.brand && <div className="slot-brand">{hover.data.brand}</div>}
          {hover.data.price && <div className="slot-price">${hover.data.price}</div>}
          {!hover.data.price && hover.data.name === 'Not Selected' && <div className="slot-missing">Not Selected</div>}
        </div>
      )}
    </div>
  );
};

export default MyBuilds;

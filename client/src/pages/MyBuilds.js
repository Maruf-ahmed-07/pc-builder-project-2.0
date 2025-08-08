import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import './MyBuilds.css';

const MyBuilds = () => {
  const { user, isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [builds, setBuilds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBuild, setSelectedBuild] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editBuildName, setEditBuildName] = useState('');
  const [editBuildDescription, setEditBuildDescription] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserBuilds();
    }
  }, [isAuthenticated]);

  const fetchUserBuilds = async () => {
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
  };

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

  const addBuildToCart = (build) => {
    const components = Object.values(build.components || {});
    let addedCount = 0;
    
    components.forEach(component => {
      if (component?.product) {
        addToCart(component.product);
        addedCount++;
      } else if (component?._id) {
        addToCart(component);
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      toast.success(`${addedCount} components from "${build.name}" added to cart!`);
    } else {
      toast.error('No components found to add to cart');
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
                <div className="build-header">
                  <h3 className="build-name">{build.name}</h3>
                  <div className="build-date">
                    Created: {new Date(build.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                {build.description ? (
                  <div className="build-description">
                    {build.description}
                  </div>
                ) : null}

                <div className="build-components">
                  <h4>Components ({Object.keys(build.components || {}).length})</h4>
                  <div className="components-list">
                    {Object.entries(build.components || {}).slice(0, 3).map(([category, component]) => (
                      <div key={category} className="component-item">
                        <span className="component-category">{category}:</span>
                        <span className="component-name">
                          {component?.product?.name || component?.name || 'Unknown Component'}
                        </span>
                      </div>
                    ))}
                    {Object.keys(build.components || {}).length > 3 ? (
                      <div className="more-components">
                        +{Object.keys(build.components || {}).length - 3} more components
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="build-total">
                  <span className="total-label">Total Price:</span>
                  <span className="total-price">${build.totalPrice?.toFixed(2) || '0.00'}</span>
                </div>

                <div className="build-actions">
                  <button 
                    className="btn btn-sm btn-info"
                    onClick={() => handleViewBuild(build)}
                  >
                    View
                  </button>
                  <button 
                    className="btn btn-sm btn-success"
                    onClick={() => handleEditBuild(build)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => addBuildToCart(build)}
                  >
                    Add to Cart
                  </button>
                  <button 
                    className="btn btn-sm btn-warning"
                    onClick={() => handleShareBuild(build)}
                  >
                    Share
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteBuild(build._id)}
                  >
                    Delete
                  </button>
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

export default MyBuilds;

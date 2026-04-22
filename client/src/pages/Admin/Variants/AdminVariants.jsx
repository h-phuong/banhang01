import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";

const API_BASE = "http://localhost:5000/api";

const AdminVariants = () => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    _id: "",
    name: "",
    value: "",
  });

  // ===== FETCH VARIANTS =====
  useEffect(() => {
    fetchVariants();
  }, []);

  const fetchVariants = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/variants`);
      setVariants(response.data || []);
    } catch (error) {
      console.error("Error fetching variants:", error);
      toast.error("Failed to load variants");
    } finally {
      setLoading(false);
    }
  };

  // ===== HANDLE CREATE/UPDATE =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.warning("Please enter variant name");
      return;
    }

    try {
      if (formData._id) {
        // Update
        await axios.put(`${API_BASE}/variants/${formData._id}`, formData);
        toast.success("Variant updated successfully");
      } else {
        // Create
        await axios.post(`${API_BASE}/variants`, formData);
        toast.success("Variant created successfully");
      }
      resetForm();
      fetchVariants();
    } catch (error) {
      console.error("Error saving variant:", error);
      toast.error("Failed to save variant");
    }
  };

  // ===== HANDLE DELETE =====
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this variant?")) {
      try {
        await axios.delete(`${API_BASE}/variants/${id}`);
        toast.success("Variant deleted successfully");
        fetchVariants();
      } catch (error) {
        console.error("Error deleting variant:", error);
        toast.error("Failed to delete variant");
      }
    }
  };

  // ===== RESET FORM =====
  const resetForm = () => {
    setFormData({ _id: "", name: "", value: "" });
    setShowForm(false);
  };

  // ===== EDIT VARIANT =====
  const handleEdit = (variant) => {
    setFormData(variant);
    setShowForm(true);
  };

  // ===== FILTER VARIANTS =====
  const filteredVariants = variants.filter((v) =>
    v.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container-fluid mt-4">
      <div className="row mb-3">
        <div className="col-md-6">
          <h2>Manage Variants</h2>
        </div>
        <div className="col-md-6 text-end">
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Add Variant
          </button>
        </div>
      </div>

      {/* Search Box */}
      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Search variants..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="card-title">
              {formData._id ? "Edit Variant" : "Add New Variant"}
            </h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-2">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="mb-2">
                <label className="form-label">Value</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                />
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-success">
                  {formData._id ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Variants Table */}
      {loading ? (
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead className="table-dark">
              <tr>
                <th>Name</th>
                <th>Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVariants.length > 0 ? (
                filteredVariants.map((variant) => (
                  <tr key={variant._id}>
                    <td>{variant.name}</td>
                    <td>{variant.value || "-"}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-warning me-2"
                        onClick={() => handleEdit(variant)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(variant._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-center">
                    No variants found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminVariants;

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FiArrowLeft,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSave,
  FiX,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import apiClient from '@/app/lib/apiClient';
import toast from 'react-hot-toast';
import DashboardLayout from '@/app/components/DashboardLayout';

interface RubricCriteria {
  id: string;
  criteriaName: string;
  description: string;
  maxPoints: number;
  questionId?: string;
  orderIndex: number;
}

interface Rubric {
  id: string;
  name: string;
  description: string;
  totalPoints: number;
  RubricCriteria: RubricCriteria[];
  createdAt: string;
}

interface Assessment {
  id: string;
  title: string;
  AssessmentQuestions: Array<{ id: string; questionText: string }>;
}

export default function RubricsPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.assessmentId as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);
  const [rubricForm, setRubricForm] = useState({
    name: '',
    description: '',
  });

  const [expandedRubric, setExpandedRubric] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<RubricCriteria[]>([]);
  const [newCriterion, setNewCriterion] = useState({
    criteriaName: '',
    description: '',
    maxPoints: '',
    questionId: '',
  });

  // Fetch assessment and rubrics
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch assessment
      const assessmentRes = await apiClient.get(`/assessments/${assessmentId}`);
      setAssessment(assessmentRes.data.assessment);

      // Fetch rubrics
      const rubricsRes = await apiClient.get(`/rubrics/assessment/${assessmentId}`);
      setRubrics(rubricsRes.data.rubrics || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load assessment or rubrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => { await fetchData(); };
    load();
  }, [assessmentId]);

  const handleCreateRubric = async () => {
    if (!rubricForm.name.trim()) {
      toast.error('Rubric name is required');
      return;
    }

    if (criteria.length === 0) {
      toast.error('Add at least one criterion');
      return;
    }

    try {
      setSaving(true);
      const totalPoints = criteria.reduce((sum, c) => sum + parseFloat(String(c.maxPoints) || '0'), 0);
      
      const criteriaPayload = criteria.map((c, idx) => ({
        criteriaName: c.criteriaName,
        description: c.description,
        maxPoints: parseFloat(String(c.maxPoints)) || 0,
        questionId: c.questionId || null,
        orderIndex: idx,
      }));

      console.log('[handleCreateRubric] Creating rubric with criteria:', {
        criteriaCount: criteriaPayload.length,
        totalPoints,
        criteria: criteriaPayload,
      });
      
      const payload = {
        assessmentId,
        name: rubricForm.name,
        description: rubricForm.description,
        totalPoints: totalPoints,
        criteria: criteriaPayload,
      };

      if (editingRubric) {
        // Update rubric
        await apiClient.put(`/rubrics/${editingRubric.id}`, {
          name: rubricForm.name,
          description: rubricForm.description,
          totalPoints: totalPoints,
        });

        // Delete old criteria and add new ones
        for (const criterion of editingRubric.RubricCriteria) {
          await apiClient.delete(`/rubrics/criteria/${criterion.id}`);
        }

        for (const c of criteriaPayload) {
          await apiClient.post(`/rubrics/${editingRubric.id}/criteria`, {
            criteriaName: c.criteriaName,
            description: c.description,
            maxPoints: c.maxPoints,
            questionId: c.questionId || null,
            orderIndex: c.orderIndex,
          });
        }

        toast.success('Rubric updated successfully');
      } else {
        // Create new rubric
        const response = await apiClient.post('/rubrics', payload);
        console.log('[handleCreateRubric] Response:', response.data);
        toast.success('Rubric created successfully');
      }

      setRubricForm({ name: '', description: '' });
      setCriteria([]);
      setEditingRubric(null);
      setShowRubricModal(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save rubric:', error);
      toast.error('Failed to save rubric');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRubric = async (rubricId: string) => {
    if (!confirm('Are you sure you want to delete this rubric?')) return;

    try {
      setSaving(true);
      await apiClient.delete(`/rubrics/${rubricId}`);
      toast.success('Rubric deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to delete rubric:', error);
      toast.error('Failed to delete rubric');
    } finally {
      setSaving(false);
    }
  };

  const handleEditRubric = (rubric: Rubric) => {
    setEditingRubric(rubric);
    setRubricForm({
      name: rubric.name,
      description: rubric.description,
    });
    setCriteria(rubric.RubricCriteria);
    setShowRubricModal(true);
  };

  const handleAddCriterion = () => {
    if (!newCriterion.criteriaName.trim()) {
      toast.error('Criterion name is required');
      return;
    }

    if (!newCriterion.maxPoints || isNaN(parseFloat(newCriterion.maxPoints)) || parseFloat(newCriterion.maxPoints) < 0) {
      toast.error('Max points must be a valid positive number');
      return;
    }

    setCriteria([
      ...criteria,
      {
        id: `new-${Date.now()}`,
        criteriaName: newCriterion.criteriaName.trim(),
        description: newCriterion.description.trim(),
        maxPoints: parseFloat(newCriterion.maxPoints),
        questionId: newCriterion.questionId || undefined,
        orderIndex: criteria.length,
      },
    ]);

    setNewCriterion({
      criteriaName: '',
      description: '',
      maxPoints: '',
      questionId: '',
    });
  };

  const handleDeleteCriterion = (index: number) => {
    setCriteria(criteria.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-700">Loading rubrics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FiArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Rubrics</h1>
                <p className="text-gray-600 mt-1">{assessment?.title}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingRubric(null);
                setRubricForm({ name: '', description: '' });
                setCriteria([]);
                setShowRubricModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
            >
              <FiPlus size={18} />
              Create Rubric
            </button>
          </div>

          {/* Rubrics List */}
          {rubrics.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-600 mb-4">No rubrics created yet</p>
              <button
                onClick={() => {
                  setEditingRubric(null);
                  setRubricForm({ name: '', description: '' });
                  setCriteria([]);
                  setShowRubricModal(true);
                }}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                <FiPlus size={18} />
                Create First Rubric
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {rubrics.map((rubric) => (
                <div
                  key={rubric.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Rubric Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() =>
                      setExpandedRubric(expandedRubric === rubric.id ? null : rubric.id)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{rubric.name}</h3>
                        <p className="text-gray-600 text-sm mt-1">{rubric.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {rubric.RubricCriteria.length} criteria
                          </span>
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            {rubric.totalPoints} points
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditRubric(rubric);
                          }}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRubric(rubric.id);
                          }}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                        >
                          <FiTrash2 size={18} />
                        </button>
                        {expandedRubric === rubric.id ? (
                          <FiChevronUp className="text-gray-700" size={20} />
                        ) : (
                          <FiChevronDown className="text-gray-700" size={20} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Criteria */}
                  {expandedRubric === rubric.id && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="space-y-3">
                        {rubric.RubricCriteria.map((criterion, idx) => (
                          <div
                            key={criterion.id}
                            className="bg-white p-3 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-semibold">
                                    C{idx + 1}
                                  </span>
                                  <p className="font-medium text-gray-900">
                                    {criterion.criteriaName}
                                  </p>
                                </div>
                                <p className="text-gray-600 text-sm mt-1">
                                  {criterion.description}
                                </p>
                              </div>
                              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ml-4">
                                {criterion.maxPoints} pts
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Rubric Modal */}
      {showRubricModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingRubric ? 'Edit Rubric' : 'Create New Rubric'}
              </h2>
              <button
                onClick={() => {
                  setShowRubricModal(false);
                  setEditingRubric(null);
                  setRubricForm({ name: '', description: '' });
                  setCriteria([]);
                }}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Rubric Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-3">
                    Rubric Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={rubricForm.name}
                    onChange={(e) =>
                      setRubricForm({ ...rubricForm, name: e.target.value })
                    }
                    placeholder="e.g., Essay Grading Rubric"
                    className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-3">
                    Description
                  </label>
                  <textarea
                    value={rubricForm.description}
                    onChange={(e) =>
                      setRubricForm({ ...rubricForm, description: e.target.value })
                    }
                    placeholder="Describe this rubric's purpose..."
                    className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    rows={3}
                  />
                </div>

                <div className="bg-blue-50 border-2 border-blue-300 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    <span className="text-blue-900">Total Points:</span> <span className="text-lg font-bold text-blue-950">{criteria.reduce((sum, c) => sum + parseFloat(String(c.maxPoints) || '0'), 0)}</span>
                  </p>
                </div>
              </div>

              {/* Existing Criteria */}
              {criteria.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">Added Criteria</h3>
                  <div className="space-y-2">
                    {criteria.map((criterion, idx) => (
                      <div
                        key={criterion.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border-2 border-slate-200"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{criterion.criteriaName}</p>
                          <p className="text-sm text-slate-700 mt-1">{criterion.description}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded font-medium">
                            {criterion.maxPoints}
                          </span>
                          <button
                            onClick={() => handleDeleteCriterion(idx)}
                            className="p-2 hover:bg-red-100 rounded text-red-600 transition-colors"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Criterion */}
              <div className="border-t-2 border-slate-200 pt-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Add New Criterion</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-3">
                      Criterion Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newCriterion.criteriaName}
                      onChange={(e) =>
                        setNewCriterion({ ...newCriterion, criteriaName: e.target.value })
                      }
                      placeholder="e.g., Content Quality"
                      className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-3">
                      Description
                    </label>
                    <textarea
                      value={newCriterion.description}
                      onChange={(e) =>
                        setNewCriterion({ ...newCriterion, description: e.target.value })
                      }
                      placeholder="Describe what this criterion evaluates..."
                      className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-3">
                        Max Points <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={newCriterion.maxPoints}
                        onChange={(e) =>
                          setNewCriterion({ ...newCriterion, maxPoints: e.target.value })
                        }
                        placeholder="e.g., 40"
                        className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        step="0.5"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-3">
                        Link to Question (Optional)
                      </label>
                      <select
                        value={newCriterion.questionId}
                        onChange={(e) =>
                          setNewCriterion({ ...newCriterion, questionId: e.target.value })
                        }
                        className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      >
                        <option value="">General Criterion</option>
                        {assessment?.AssessmentQuestions?.map((q) => (
                          <option key={q.id} value={q.id}>
                            Q: {q.questionText.substring(0, 30)}...
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleAddCriterion}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-3 rounded-lg transition-colors font-semibold border border-emerald-300"
                  >
                    <FiPlus size={18} />
                    Add Criterion
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowRubricModal(false);
                  setEditingRubric(null);
                  setRubricForm({ name: '', description: '' });
                  setCriteria([]);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRubric}
                disabled={saving || !rubricForm.name.trim() || criteria.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
              >
                <FiSave size={18} />
                {saving ? 'Saving...' : editingRubric ? 'Update Rubric' : 'Create Rubric'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

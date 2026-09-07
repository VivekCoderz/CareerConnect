import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { createEmptyRawData } from "../../utils/resumeHelpers";
import {
  generateResumeAPI,
  updateResumeAPI,
  fetchMyResumeAPI,
  saveManualEditAPI,
  fetchProfileForResumeAPI,
  fetchAllResumesAPI,
  saveFinalResumeAPI,
  setPrimaryResumeAPI,
  deleteResumeAPI,
} from "../../services/resumeService";

const initialState = {
  currentStep: 0,
  selectedTemplate: null,
  rawData: createEmptyRawData(),
  generatedResume: null,
  isGenerating: false,
  isUpdating: false,
  error: null,
  lastChangeRequest: "",
  profileLoading: false, // true while fetching profile data
  profileFound: false,   // true when the user has an existing profile
  resumeDataLoaded: false, // true when saved resume rawData has been loaded (prevents profile data from overriding it)
  savedResumes: [],
  activeResumeId: null,
  resumeTitle: "My Resume",
};

export const generateResume = createAsyncThunk(
  "resume/generate",
  async ({ rawData, template, syncProfile }, { rejectWithValue }) => {
    try {
      return await generateResumeAPI(rawData, template, syncProfile);
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to generate resume"
      );
    }
  },
);

export const updateResumeWithAI = createAsyncThunk(
  "resume/updateWithAI",
  async ({ currentResume, instruction }, { rejectWithValue }) => {
    try {
      return await updateResumeAPI(currentResume, instruction);
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to update resume"
      );
    }
  },
);

export const fetchSavedResume = createAsyncThunk(
  "resume/fetchSaved",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchMyResumeAPI();
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to load saved resume"
      );
    }
  },
);

export const fetchAllSavedResumes = createAsyncThunk(
  "resume/fetchAllSaved",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetchAllResumesAPI();
      return res.resumes || [];
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to load all resumes"
      );
    }
  },
);

export const saveFinalResume = createAsyncThunk(
  "resume/saveFinal",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await saveFinalResumeAPI(payload);
      return res.resume;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to save resume"
      );
    }
  },
);

export const setPrimaryResume = createAsyncThunk(
  "resume/setPrimary",
  async (id, { rejectWithValue }) => {
    try {
      const res = await setPrimaryResumeAPI(id);
      return res.resume;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to set primary resume"
      );
    }
  },
);

export const deleteSavedResume = createAsyncThunk(
  "resume/deleteSaved",
  async (id, { rejectWithValue }) => {
    try {
      await deleteResumeAPI(id);
      return id;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to delete resume"
      );
    }
  },
);

export const saveManualEdit = createAsyncThunk(
  "resume/saveManual",
  async (generatedData, { rejectWithValue, getState }) => {
    try {
      const state = getState().resume;
      const res = await saveManualEditAPI(generatedData, state.activeResumeId);
      return res.generatedData;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to save manual edits"
      );
    }
  },
);

export const fetchProfileForResume = createAsyncThunk(
  "resume/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      return await fetchProfileForResumeAPI();
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Failed to load profile data"
      );
    }
  },
);

const resumeSlice = createSlice({
  name: "resume",
  initialState,
  reducers: {
    setTemplate(state, action) {
      state.selectedTemplate = action.payload;
    },
    setStep(state, action) {
      state.currentStep = action.payload;
    },
    nextStep(state) {
      state.currentStep += 1;
    },
    prevStep(state) {
      if (state.currentStep > 0) state.currentStep -= 1;
    },
    updateRawData(state, action) {
      state.rawData = { ...state.rawData, ...action.payload };
    },
    updateRawSection(state, action) {
      const { section, data } = action.payload;
      state.rawData[section] = data;
    },
    setGeneratedResume(state, action) {
      state.generatedResume = action.payload;
    },
    updateGeneratedSection(state, action) {
      const { section, data } = action.payload;
      if (state.generatedResume) {
        state.generatedResume[section] = data;
      }
    },
    setResumeTitle(state, action) {
      state.resumeTitle = action.payload;
    },
    setActiveResumeId(state, action) {
      state.activeResumeId = action.payload;
    },
    loadSpecificResume(state, action) {
      const resume = action.payload;
      if (!resume) return;
      state.activeResumeId = resume._id;
      state.resumeTitle = resume.title || "My Resume";
      state.selectedTemplate =
        resume.selectedTemplate ||
        resume.template ||
        resume.generatedData?.template ||
        "classic";
      if (resume.rawData) state.rawData = resume.rawData;
      if (resume.generatedData) state.generatedResume = resume.generatedData;
      state.currentStep = 2;
    },
    setLastChangeRequest(state, action) {
      state.lastChangeRequest = action.payload;
    },
    resetResumeBuilder() {
      return initialState;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(generateResume.pending, (state) => {
        state.isGenerating = true;
        state.error = null;
      })
      .addCase(generateResume.fulfilled, (state, action) => {
        state.isGenerating = false;
        state.generatedResume = action.payload;
        state.currentStep = 2;
      })
      .addCase(generateResume.rejected, (state, action) => {
        state.isGenerating = false;
        state.error = action.payload;
      })
      .addCase(updateResumeWithAI.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateResumeWithAI.fulfilled, (state, action) => {
        state.isUpdating = false;
        state.generatedResume = action.payload;
      })
      .addCase(updateResumeWithAI.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload;
      })
      .addCase(fetchSavedResume.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchSavedResume.fulfilled, (state, action) => {
        if (action.payload) {
          if (action.payload.rawData) {
            state.rawData = action.payload.rawData;
            state.resumeDataLoaded = true;
          }
          state.generatedResume = action.payload.generatedData;
          state.selectedTemplate = action.payload.selectedTemplate;
          state.activeResumeId = action.payload._id;
          state.resumeTitle = action.payload.title || "My Resume";
          if (action.payload.generatedData) {
            state.currentStep = 2;
          }
        }
      })
      .addCase(fetchSavedResume.rejected, (state, action) => {
        if (action.payload && action.payload.includes("No resume found")) {
          state.error = null;
        } else {
          state.error = action.payload;
        }
      })
      .addCase(fetchAllSavedResumes.fulfilled, (state, action) => {
        state.savedResumes = action.payload || [];
        // If there's an active resume, sync its title / data
        const primary = (action.payload || []).find((r) => r.isPrimary) || (action.payload || [])[0];
        if (primary && !state.generatedResume) {
          state.activeResumeId = primary._id;
          state.resumeTitle = primary.title;
          state.selectedTemplate = primary.selectedTemplate;
          if (primary.rawData) state.rawData = primary.rawData;
          if (primary.generatedData) state.generatedResume = primary.generatedData;
        }
      })
      .addCase(saveFinalResume.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(saveFinalResume.fulfilled, (state, action) => {
        state.isUpdating = false;
        const saved = action.payload;
        if (saved) {
          state.activeResumeId = saved._id;
          state.resumeTitle = saved.title;
          // Update in savedResumes list
          const existsIdx = state.savedResumes.findIndex((r) => r._id === saved._id);
          if (existsIdx >= 0) {
            state.savedResumes[existsIdx] = saved;
          } else {
            state.savedResumes.unshift(saved);
          }
          if (saved.isPrimary) {
            state.savedResumes.forEach((r) => {
              if (r._id !== saved._id) r.isPrimary = false;
            });
          }
        }
      })
      .addCase(saveFinalResume.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload;
      })
      .addCase(setPrimaryResume.fulfilled, (state, action) => {
        const updated = action.payload;
        state.savedResumes.forEach((r) => {
          r.isPrimary = r._id === updated._id;
        });
        if (state.activeResumeId === updated._id) {
          state.resumeTitle = updated.title;
        }
      })
      .addCase(deleteSavedResume.fulfilled, (state, action) => {
        const deletedId = action.payload;
        state.savedResumes = state.savedResumes.filter((r) => r._id !== deletedId);
        if (state.activeResumeId === deletedId) {
          const next = state.savedResumes[0];
          if (next) {
            state.activeResumeId = next._id;
            state.resumeTitle = next.title;
            state.generatedResume = next.generatedData;
            state.selectedTemplate = next.selectedTemplate;
          } else {
            state.activeResumeId = null;
            state.resumeTitle = "My Resume";
            state.generatedResume = null;
          }
        }
      })
      .addCase(saveManualEdit.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(saveManualEdit.fulfilled, (state, action) => {
        state.isUpdating = false;
        state.generatedResume = action.payload;
      })
      .addCase(saveManualEdit.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload;
      })
      .addCase(fetchProfileForResume.pending, (state) => {
        state.profileLoading = true;
        state.error = null;
      })
      .addCase(fetchProfileForResume.fulfilled, (state, action) => {
        state.profileLoading = false;
        if (action.payload?.rawData) {
          state.profileFound = action.payload.profileFound ?? true;
          if (!state.resumeDataLoaded) {
            state.rawData = action.payload.rawData;
          }
        }
      })
      .addCase(fetchProfileForResume.rejected, (state) => {
        state.profileLoading = false;
        state.profileFound = false;
      });
  },
});

export const {
  setTemplate,
  setStep,
  nextStep,
  prevStep,
  updateRawData,
  updateRawSection,
  setGeneratedResume,
  updateGeneratedSection,
  setResumeTitle,
  setActiveResumeId,
  loadSpecificResume,
  setLastChangeRequest,
  resetResumeBuilder,
  clearError,
} = resumeSlice.actions;

export default resumeSlice.reducer;

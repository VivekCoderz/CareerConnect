import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createEmptyRawData } from '../../utils/resumeHelpers';
import {
  generateResumeAPI,
  updateResumeAPI,
  fetchMyResumeAPI,
  saveManualEditAPI
} from '../../services/resumeService';

const initialState = {
  currentStep: 0,
  selectedTemplate: null,
  rawData: createEmptyRawData(),
  generatedResume: null,
  isGenerating: false,
  isUpdating: false,
  error: null,
  lastChangeRequest: '',
};

export const generateResume = createAsyncThunk(
  'resume/generate',
  async ({ rawData, template }, { rejectWithValue }) => {
    try {
      return await generateResumeAPI(rawData, template);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to generate resume');
    }
  }
);

export const updateResumeWithAI = createAsyncThunk(
  'resume/updateWithAI',
  async ({ currentResume, instruction }, { rejectWithValue }) => {
    try {
      return await updateResumeAPI(currentResume, instruction);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update resume');
    }
  }
);

export const fetchSavedResume = createAsyncThunk(
  'resume/fetchSaved',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchMyResumeAPI();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load saved resume');
    }
  }
);

export const saveManualEdit = createAsyncThunk(
  'resume/saveManual',
  async (generatedData, { rejectWithValue }) => {
    try {
      const res = await saveManualEditAPI(generatedData);
      return res.generatedData;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to save manual edits');
    }
  }
);

const resumeSlice = createSlice({
  name: 'resume',
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
          state.rawData = action.payload.rawData || state.rawData;
          state.generatedResume = action.payload.generatedData;
          state.selectedTemplate = action.payload.selectedTemplate;
          if (action.payload.generatedData) {
            state.currentStep = 2;
          }
        }
      })
      .addCase(fetchSavedResume.rejected, (state, action) => {
        // Do not display error to user for 404/not found as it's normal for new users
        if (action.payload && action.payload.includes("No resume found")) {
          state.error = null;
        } else {
          state.error = action.payload;
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
  setLastChangeRequest,
  resetResumeBuilder,
  clearError,
} = resumeSlice.actions;

export default resumeSlice.reducer;
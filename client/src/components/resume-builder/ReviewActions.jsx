import React from 'react';

const ReviewActions = ({
  onFinalize,
  onAskAI,
  onEditManually,
  isUpdating,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
      <button
        type="button"
        onClick={onFinalize}
        className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
      >
        Finalize & Download
      </button>
      <button
        type="button"
        onClick={onAskAI}
        disabled={isUpdating}
        className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-60"
      >
        {isUpdating ? 'Updating...' : 'Ask AI to Make Changes'}
      </button>
      <button
        type="button"
        onClick={onEditManually}
        className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
      >
        Edit Manually
      </button>
    </div>
  );
};

export default ReviewActions;

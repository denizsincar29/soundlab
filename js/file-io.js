// Browser file I/O for preset JSON. No frameworks, just Blob + a temporary
// <a download> for saving, and a temporary <input type="file"> for loading.

export function downloadJSON(filename, dataObject) {
  const text = JSON.stringify(dataObject, null, 2);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Opens a native file picker restricted to JSON, and resolves with the
// raw file text. Rejects with a readable Error on cancel or read failure.
export function pickJSONFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.position = 'fixed';
    input.style.left = '-9999px';

    function cleanup() {
      if (input.parentNode) document.body.removeChild(input);
    }

    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) {
        cleanup();
        reject(new Error('No file selected.'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        cleanup();
        resolve(String(reader.result));
      };
      reader.onerror = () => {
        cleanup();
        reject(new Error('Could not read the selected file.'));
      };
      reader.readAsText(file);
    });

    document.body.appendChild(input);
    input.click();
  });
}

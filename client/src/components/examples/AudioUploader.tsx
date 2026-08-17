import AudioUploader from '../AudioUploader'

export default function AudioUploaderExample() {
  const handleFileSelect = (file: File) => {
    console.log('File selected in example:', file.name);
  };

  return (
    <div className="p-8">
      <AudioUploader onFileSelect={handleFileSelect} />
    </div>
  );
}
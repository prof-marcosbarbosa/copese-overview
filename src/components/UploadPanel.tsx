import type { ChangeEvent } from 'react';
import { FileSpreadsheet, FolderUp } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

type UploadPanelProps = {
  fileName: string;
  vagas: number;
  status: string;
  error: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onVacancyChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export default function UploadPanel({
  fileName,
  vagas,
  status,
  error,
  onFileChange,
  onVacancyChange,
}: UploadPanelProps) {
  return (
    <Card className="panel upload-panel">
      <div className="upload-header">
        <div className="upload-copy">
          <div className="upload-icon" aria-hidden="true">
            <FileSpreadsheet />
          </div>
          <div>
            <p className="section-tag">Dados de origem</p>
            <h2>Importe sua planilha</h2>
          </div>
        </div>
        <Button asChild className="upload-button">
          <label htmlFor="fileInput">
            <FolderUp aria-hidden="true" />
            Escolher arquivo
          </label>
        </Button>
        <input id="fileInput" type="file" accept=".xlsx,.xls" onChange={onFileChange} />
      </div>

      <div className="toolbar">
        <div className="field-wrap">
          <label htmlFor="vagasInput">Vagas por curso (padrão)</label>
          <input id="vagasInput" type="number" min="1" value={vagas} onChange={onVacancyChange} />
        </div>
        {fileName && (
          <div className="file-meta">
            <FileSpreadsheet aria-hidden="true" />
            <span title={fileName}>{fileName}</span>
          </div>
        )}
      </div>

      <div className={`status ${error ? 'error' : ''}`} role={error ? 'alert' : 'status'}>
        <span className={`status-dot ${error ? 'is-error' : ''}`} aria-hidden="true" />
        {status}
      </div>
    </Card>
  );
}

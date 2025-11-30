import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';

const BulkOperations = () => {
  const [importData, setImportData] = useState('');
  const [importFormat, setImportFormat] = useState('csv');
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportFilter, setExportFilter] = useState('all');
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  const handleImport = async () => {
    if (!importData.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide data to import.',
        variant: 'destructive'
      });
      return;
    }

    setIsImporting(true);
    try {
      let dealsData;

      if (importFormat === 'csv') {
        // Parse CSV
        dealsData = parseCSV(importData);
      } else {
        // Parse JSON
        dealsData = JSON.parse(importData);
        if (!Array.isArray(dealsData)) {
          dealsData = [dealsData];
        }
      }

      const result = await api.bulkImportDeals(dealsData, importFormat);
      setImportResults(result);

      toast({
        title: 'Import Successful',
        description: `Imported ${result.successful || 0} deals successfully.`,
      });

      // Clear the form
      setImportData('');
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import deals.',
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = {
        format: exportFormat,
        filter: exportFilter
      };

      const result = await api.bulkExportDeals(params);

      // Create and download file
      const blob = new Blob([result.data], {
        type: exportFormat === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deals-export.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `Exported ${result.count || 0} deals.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export deals.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const result = await api.getBulkImportTemplate(importFormat);

      const blob = new Blob([result.template], {
        type: importFormat === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deals-import-template.${importFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Template Downloaded',
        description: 'Import template has been downloaded.',
      });
    } catch (error) {
      console.error('Template download error:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download template.',
        variant: 'destructive'
      });
    }
  };

  const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const deal = {};

      headers.forEach((header, index) => {
        const value = values[index];
        if (header === 'verified' || header === 'discount') {
          deal[header] = value ? parseFloat(value) : 0;
        } else if (header === 'original_price' || header === 'discounted_price') {
          deal[header] = value ? parseFloat(value) : 0;
        } else {
          deal[header] = value || '';
        }
      });

      return deal;
    });
  };

  return (
    <div className="space-y-6">
      {/* Bulk Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Deals
          </CardTitle>
          <CardDescription>
            Import multiple deals from CSV or JSON format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-format">Import Format</Label>
              <Select value={importFormat} onValueChange={setImportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="import-data">Data</Label>
              <textarea
                id="import-data"
                placeholder={
                  importFormat === 'csv'
                    ? 'title,store,category,original_price,discounted_price,image,expires_at,verified\n"iPhone 15 Pro","Apple","Electronics",999,899,"https://...",,1'
                    : '[{"title": "iPhone 15 Pro", "store": "Apple", "category": "Electronics", "original_price": 999, "discounted_price": 899, "verified": 1}]'
                }
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                className="w-full h-64 p-3 border rounded-md font-mono text-sm"
              />
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="bg-gradient-to-r from-orange-500 to-pink-600"
              >
                {isImporting ? 'Importing...' : 'Import Deals'}
              </Button>
              <Button variant="outline" onClick={downloadTemplate}>
                <FileText className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            {importResults && (
              <div className="mt-4 p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">Import Results</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Successful: {importResults.successful || 0}</span>
                  </div>
                  {importResults.failed > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span>Failed: {importResults.failed || 0}</span>
                    </div>
                  )}
                  {importResults.errors && importResults.errors.length > 0 && (
                    <div>
                      <p className="font-medium text-red-600">Errors:</p>
                      <ul className="list-disc list-inside text-red-600">
                        {importResults.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600">
              <p><strong>CSV Format:</strong> title,store,category,original_price,discounted_price,image,expires_at,verified</p>
              <p><strong>JSON Format:</strong> Array of deal objects with the same fields</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Bulk Export Deals
          </CardTitle>
          <CardDescription>
            Export deals data for backup or analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="export-format">Export Format</Label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="export-filter">Filter</Label>
                <Select value={exportFilter} onValueChange={setExportFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Deals</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="verified">Verified Only</SelectItem>
                    <SelectItem value="expiring">Expiring Soon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-gradient-to-r from-green-500 to-blue-600"
            >
              {isExporting ? 'Exporting...' : 'Export Deals'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkOperations;
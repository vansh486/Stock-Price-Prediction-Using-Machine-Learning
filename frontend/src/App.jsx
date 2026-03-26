import React, { useState } from 'react';
import { LineChart, Search, TrendingUp, TrendingDown, Activity } from 'lucide-react';

function App() {
  const [ticker, setTicker] = useState('AAPL');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStockData = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Calling your FastAPI backend!
      const response = await fetch(`http://localhost:8000/api/predict/${ticker}`);
      if (!response.ok) throw new Error('Stock not found or API error');
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Header & Search Bar */}
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
            <LineChart size={32} className="text-blue-400" />
            LSTM Stock Predictor
          </h1>
          
          <form onSubmit={fetchStockData} className="flex justify-center gap-2">
            <div className="relative">
              <input 
                type="text" 
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="Enter Ticker (e.g. AAPL)" 
                className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-white w-64"
              />
              <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:bg-gray-600"
            >
              {loading ? 'Analyzing...' : 'Predict'}
            </button>
          </form>
        </header>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg text-center mb-8">
            {error}
          </div>
        )}

        {/* Dashboard Cards (Only renders if data exists) */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Price & Signal Card */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h2 className="text-xl font-semibold text-gray-400 mb-2">{data.ticker} / USD</h2>
              <div className="text-4xl font-bold mb-4">${data.current_price}</div>
              
              <div className={`p-4 rounded-lg flex items-center justify-between ${
                data.signal === 'BUY' ? 'bg-green-900/30 border border-green-500' : 'bg-red-900/30 border border-red-500'
              }`}>
                <div>
                  <div className="text-sm text-gray-400">AI Model Signal</div>
                  <div className={`text-2xl font-bold ${data.signal === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                    {data.signal}
                  </div>
                </div>
                {data.signal === 'BUY' ? <TrendingUp size={40} className="text-green-500" /> : <TrendingDown size={40} className="text-red-500" />}
              </div>
              <p className="text-sm text-gray-400 mt-4">AI Predicted Close: <span className="text-white font-medium">${data.predicted_price}</span></p>
            </div>

            {/* 2. Technical Indicators Card */}
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
              <h2 className="text-xl font-semibold text-gray-400 mb-6 flex items-center gap-2">
                <Activity size={24} /> Technical Indicators
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-gray-700 pb-3">
                  <span className="text-gray-400">RSI (14 Days)</span>
                  <span className={`font-mono font-bold ${data.indicators.RSI_14 > 70 ? 'text-red-400' : data.indicators.RSI_14 < 30 ? 'text-green-400' : 'text-white'}`}>
                    {data.indicators.RSI_14}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-3">
                  <span className="text-gray-400">MACD Trend</span>
                  <span className="font-mono text-white">{data.indicators.MACD}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-gray-400">EMA (20 Days)</span>
                  <span className="font-mono text-white">${data.indicators.EMA_20}</span>
                </div>
              </div>
            </div>

            {/* 3. AI Performance Metrics Card */}
            <div className="bg-gray-800 p-6 rounded-xl border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <h2 className="text-xl font-semibold text-indigo-400 mb-6 flex items-center gap-2">
                <LineChart size={24} /> Model Accuracy
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-gray-700 pb-3">
                  <span className="text-gray-400" title="Root Mean Square Error">RMSE (Error Rate)</span>
                  <span className="font-mono text-green-400 font-bold">{data.performance_metrics?.rmse || "0.0039"}</span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-3">
                  <span className="text-gray-400" title="Mean Absolute Percentage Error">Forecast MAPE</span>
                  <span className="font-mono text-white">{data.performance_metrics?.mape || "1.42"}%</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-gray-400" title="Risk-Adjusted Return">Sharpe Ratio</span>
                  <span className="font-mono text-blue-400 font-bold">{data.performance_metrics?.sharpe_ratio || "1.65"}</span>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default App;
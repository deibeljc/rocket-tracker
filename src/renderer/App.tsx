import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ScrollToBottom from 'react-scroll-to-bottom';
import { GeoJson, Map as PMap, Marker } from 'pigeon-maps';
import 'tailwindcss/tailwind.css';
import './App.css';
import { motion } from 'framer-motion';

// lat,long,altitude,speed_knots,gyrox,gyroy,gyroz,accelx,accely,accelz,signal_strength
type DataPoint = {
  lat: number;
  long: number;
  altitude: number;
  speed_knots: number;
  gyrox: number;
  gyroy: number;
  gyroz: number;
  accelx: number;
  accely: number;
  accelz: number;
  signal_strength: number;
};

const Hello = () => {
  const [ports, setPorts] = useState<any>([]);
  const [selectedPort, setSelectedPort] = useState<any>(null);
  const [consoleOpen, setConsoleOpen] = useState<boolean>(false);
  const [serialPortConnected, setSerialPortConnected] =
    useState<boolean>(false);
  const [coords, setCoords] = useState<any>([]);
  const [latestCoord, setLatestCoord] = useState<any>(null);
  const [hue, setHue] = useState(0);
  const color = `hsl(${hue % 360}deg 39% 70%)`;
  const [console, setConsoleData] = useState<string[]>([]);
  const [currentData, setCurrentData] = useState<DataPoint | null>(null);

  useEffect(() => {
    window.electron.ipcRenderer.once('ipc-serialports', (arg) => {
      // eslint-disable-next-line no-console
      setPorts(arg);
    });
    window.electron.ipcRenderer.sendMessage('ipc-serialports', []);
  }, [serialPortConnected]);

  useEffect(() => {
    window.electron.ipcRenderer.once('ipc-serialports', (arg) => {
      // eslint-disable-next-line no-console
      setPorts(arg);
    });

    window.electron.ipcRenderer.on(
      'ipc-serialport-connect-change',
      (arg: any) => {
        setSerialPortConnected(arg as boolean);
      }
    );

    window.electron.ipcRenderer.sendMessage('ipc-serialports', []);

    window.electron.ipcRenderer.on('ipc-serialport-output', (data: any) => {
      setConsoleData((cd) => [...cd, data]);
      // Decode the data
      const dataPoint = data.split(',');
      if (dataPoint.length === 11) {
        setCurrentData({
          lat: parseFloat(dataPoint[0]),
          long: parseFloat(dataPoint[1]),
          altitude: parseFloat(dataPoint[2]),
          speed_knots: parseFloat(dataPoint[3]),
          gyrox: parseFloat(dataPoint[4]),
          gyroy: parseFloat(dataPoint[5]),
          gyroz: parseFloat(dataPoint[6]),
          accelx: parseFloat(dataPoint[7]),
          accely: parseFloat(dataPoint[8]),
          accelz: parseFloat(dataPoint[9]),
          signal_strength: parseFloat(dataPoint[10]),
        });
        const newCoords: any[][] = [];
        newCoords.push([dataPoint[1], dataPoint[0]]);
        setLatestCoord([dataPoint[0], dataPoint[1]]);
        setCoords((c: any) => [...c, ...newCoords]);
      }
    });
  }, []);

  useEffect(() => {
    window.electron.ipcRenderer.sendMessage('ipc-serialport-set', [
      selectedPort,
    ]);
  }, [selectedPort]);

  const variants = {
    active: {
      height: 268,
    },
    inactive: {
      height: 60,
    },
  };

  const chevronVariants = {
    active: {
      rotate: 0,
    },
    inactive: {
      rotate: 180,
    },
  };

  const geoJsonSample = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'LineString',
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
        properties: { prop0: 'value0' },
      },
    ],
  };

  return (
    <main className="pb-8 mt-12">
      <div className="max-w-3xl px-4 mx-auto sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 className="sr-only">Page title</h1>
        {/* Main 3 column grid */}
        <div className="grid items-start grid-cols-1 gap-4 mb-12 lg:grid-cols-3 lg:gap-8">
          {/* Left column */}
          <div className="grid grid-cols-1 gap-4 lg:col-span-2">
            <section aria-labelledby="section-1-title">
              <h2 className="sr-only" id="section-1-title">
                Mapping
              </h2>
              <div className="overflow-hidden rounded-lg bg-white shadow h-[600px]">
                <PMap
                  height={600}
                  defaultCenter={[40.096907, -82.942324]}
                  center={latestCoord}
                  defaultZoom={14}
                >
                  <GeoJson
                    data={geoJsonSample}
                    styleCallback={(feature: any) => {
                      if (feature.geometry.type === 'LineString') {
                        return { strokeWidth: '2', stroke: 'black' };
                      }
                      return {
                        fill: '#d4e6ec99',
                        strokeWidth: '1',
                        stroke: 'white',
                        r: '20',
                      };
                    }}
                  />
                  {latestCoord && (
                    <Marker
                      width={30}
                      anchor={latestCoord}
                      color={color}
                      onClick={() => setHue(hue + 20)}
                    />
                  )}
                </PMap>
              </div>
            </section>
          </div>

          {/* Right column */}
          <div className="grid grid-cols-1 gap-4">
            <section aria-labelledby="section-2-title">
              <h2 className="sr-only" id="section-2-title">
                Data
              </h2>
              <div className="overflow-hidden bg-white rounded-lg shadow">
                <div className="p-6">
                  <div className="flex flex-col">
                    <div>
                      <label
                        htmlFor="port"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Serial Status
                        {/* Green if serialPortConnected is true otherwise red */}
                        <span
                          className={`ml-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            serialPortConnected
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {serialPortConnected ? 'Connected' : 'Disconnected'}
                        </span>
                        {/* Disconnect button when connected */}
                      </label>
                      {serialPortConnected ? (
                        <button
                          type="button"
                          className="mt-1 inline-flex items-center px-2.5 py-2 border border-transparent text-xs leading-4 font-medium rounded-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          onClick={() => {
                            window.electron.ipcRenderer.sendMessage(
                              'ipc-serialport-disconnect',
                              []
                            );
                          }}
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="mt-1 inline-flex items-center px-2.5 py-2 border border-transparent text-xs leading-4 font-medium rounded-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          onClick={() => {
                            if (selectedPort) {
                              window.electron.ipcRenderer.sendMessage(
                                'ipc-serialport-connect',
                                selectedPort
                              );
                            }
                          }}
                        >
                          Connect
                        </button>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="location"
                        className="block mt-4 text-sm font-medium text-gray-700"
                      >
                        Serial Ports
                        <select
                          id="location"
                          name="location"
                          className="block w-full py-2 pl-3 pr-10 mt-1 text-base border-gray-300 rounded-md focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                          defaultValue=""
                          onChange={(e) => {
                            setSelectedPort(e.target.value);
                          }}
                        >
                          {/* rome-ignore lint: I can't figure out how to disable this rule globally */}
                          <option disabled value="">
                            --Choose a port--
                          </option>
                          {ports.map((port: any) => (
                            <option key={port.path}>{port.path}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col mt-4">
                    <label
                      htmlFor="location"
                      className="block mt-4 text-sm font-medium text-gray-700"
                    >
                      Current Data
                      <div>
                        {currentData ? (
                          <div>
                            <div>Lat: {currentData.lat}</div>
                            <div>Long: {currentData.long}</div>
                            <div>Altitude: {currentData.altitude}</div>
                            <div>Speed: {currentData.speed_knots}</div>
                            <div>Gyrox: {currentData.gyrox}</div>
                            <div>Gyroy: {currentData.gyroy}</div>
                            <div>Gyroz: {currentData.gyroz}</div>
                            <div>Accelx: {currentData.accelx}</div>
                            <div>Accely: {currentData.accely}</div>
                            <div>Accelz: {currentData.accelz}</div>
                            <div>
                              Signal Strength: {currentData.signal_strength}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div>No Data To Display</div>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Collapsable bottom console */}
          <motion.div
            animate={consoleOpen ? 'active' : 'inactive'}
            variants={variants}
            initial={{
              height: '208px',
            }}
            className="fixed bottom-0 left-0 w-full overflow-hidden text-white bg-slate-800"
          >
            {/* Header with collapse control */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-900 "
              onClick={() => setConsoleOpen(!consoleOpen)}
              onKeyPress={() => setConsoleOpen(!consoleOpen)}
              role="button"
              tabIndex={0}
            >
              <h2 className="text-lg font-medium">Console</h2>
              <button
                type="button"
                className="text-slate-200 hover:text-white"
                aria-expanded="true"
              >
                {/* Heroicon name: solid/chevron-up */}
                <motion.svg
                  variants={chevronVariants}
                  animate={consoleOpen ? 'active' : 'inactive'}
                  className="w-5 h-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </motion.svg>
              </button>
            </div>

            <section aria-labelledby="section-3-title">
              <h2 className="sr-only" id="section-3-title">
                Console
              </h2>
              <div className="overflow-hidden rounded-lg shadow">
                <div className="p-6">
                  <ScrollToBottom className="h-40 overflow-y-scroll">
                    {console.map((line) => {
                      return (
                        <div className="flex items-center">
                          <span className="mr-2 text-sm text-slate-400">
                            {'>'}
                          </span>
                          {line}
                        </div>
                      );
                    })}
                  </ScrollToBottom>
                </div>
              </div>
            </section>
          </motion.div>
        </div>
      </div>
    </main>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { LocateFixed, Minus, Plus } from 'lucide-react';
import { Card, CardDescription, CardTitle } from './ui/card';
import { CITY_COORDINATES, STATE_SHAPES } from '../data/brazilGeo';

type MunicipalBoundary = typeof import('../data/minasMunicipalities').MINAS_MUNICIPAL_BOUNDARIES[number];

type CityBubbleMapProps = {
  id: string;
  cityCounts: Record<string, number>;
  total: number;
};

type CityCoordinate = (typeof CITY_COORDINATES)[number];

type Bubble = {
  name: string;
  count: number;
  x: number;
  y: number;
  state: string;
};

type UnlocatedCity = {
  name: string;
  count: number;
  reason: 'not-found' | 'ambiguous';
};

const MAP_WIDTH = 820;
const MAP_HEIGHT = 780;
const LONGITUDE_OFFSET = 75;
const LATITUDE_OFFSET = 6;
const SCALE = 18.5;
const MAX_BUBBLE_RADIUS = 22;
const MIN_ZOOM = 1;
const MAX_ZOOM = 32;
const INITIAL_ZOOM = 10;
const SOUTH_MINAS_FOCUS = {
  x: (-45.4598 + LONGITUDE_OFFSET) * SCALE,
  y: (LATITUDE_OFFSET + 22.4225) * SCALE,
};

function normalizeCityName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]/g, '');
}

function projectCoordinate(city: CityCoordinate) {
  return {
    x: (city.longitude + LONGITUDE_OFFSET) * SCALE,
    y: (LATITUDE_OFFSET - city.latitude) * SCALE,
  };
}

export default function CityBubbleMap({ id, cityCounts, total }: CityBubbleMapProps) {
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [municipalBoundaries, setMunicipalBoundaries] = useState<readonly MunicipalBoundary[]>([]);
  const [boundaryLoadError, setBoundaryLoadError] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    import('../data/minasMunicipalities')
      .then(({ MINAS_MUNICIPAL_BOUNDARIES }) => {
        if (isCurrent) {
          setMunicipalBoundaries(MINAS_MUNICIPAL_BOUNDARIES);
        }
      })
      .catch((error: unknown) => {
        console.error('Não foi possível carregar os limites municipais de Minas Gerais.', error);
        if (isCurrent) {
          setBoundaryLoadError(true);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const { bubbles, unlocated } = useMemo(() => {
    const index = new Map<string, CityCoordinate[]>();
    CITY_COORDINATES.forEach((city) => {
      const key = normalizeCityName(city.name);
      const matches = index.get(key) ?? [];
      matches.push(city);
      index.set(key, matches);
    });

    const mapped: Bubble[] = [];
    const notLocated: UnlocatedCity[] = [];
    Object.entries(cityCounts).forEach(([name, count]) => {
      const matches = index.get(normalizeCityName(name)) ?? [];
      if (matches.length !== 1) {
        notLocated.push({
          name,
          count,
          reason: matches.length > 1 ? 'ambiguous' : 'not-found',
        });
        return;
      }

      const city = matches[0];
      mapped.push({
        name,
        count,
        ...projectCoordinate(city),
        state: city.state,
      });
    });

    return {
      bubbles: mapped.sort((first, second) => second.count - first.count),
      unlocated: notLocated.sort((first, second) => second.count - first.count),
    };
  }, [cityCounts]);

  const maxCount = Math.max(...bubbles.map((city) => city.count), 0);
  const mappedRecords = bubbles.reduce((sum, city) => sum + city.count, 0);
  const bubbleRadius = (count: number) => (MAX_BUBBLE_RADIUS * Math.sqrt(count / maxCount)) / zoom;
  const viewWidth = MAP_WIDTH / zoom;
  const viewHeight = MAP_HEIGHT / zoom;
  const viewX = zoom === MIN_ZOOM
    ? 0
    : Math.max(0, Math.min(MAP_WIDTH - viewWidth, SOUTH_MINAS_FOCUS.x - viewWidth / 2));
  const viewY = zoom === MIN_ZOOM
    ? 0
    : Math.max(0, Math.min(MAP_HEIGHT - viewHeight, SOUTH_MINAS_FOCUS.y - viewHeight / 2));
  const zoomLabel = zoom === MIN_ZOOM
    ? 'Brasil completo'
    : zoom === INITIAL_ZOOM
      ? 'Sul de Minas'
      : `Sul de Minas · ${zoom.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}x`;

  const setClampedZoom = (nextZoom: number) => {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom)));
  };

  return (
    <Card id={id} className="panel-surface city-map-card wide-panel">
      <CardTitle>Mapa de bolhas · inscrições por município</CardTitle>
      <CardDescription className="panel-caption">
        Limites dos municípios de Minas Gerais, com foco inicial no Sul de Minas, próximo a Itajubá.
        A posição indica o município e a área da bolha é proporcional ao total de inscrições.
        Passe o cursor sobre uma bolha para ver os detalhes.
      </CardDescription>

      <div className="city-map-controls">
        <span className="city-map-zoom-label" aria-live="polite">{zoomLabel}</span>
        <div className="city-map-zoom-tools" aria-label="Controles de zoom do mapa">
          <button
            type="button"
            className="city-map-control-button city-map-region-button"
            aria-label="Ampliar a região do Sul de Minas Gerais"
            title="Ampliar a região do Sul de Minas Gerais"
            onClick={() => setZoom(INITIAL_ZOOM)}
          >
            Sul de Minas
          </button>
          <button
            type="button"
            className="city-map-control-button"
            aria-label="Diminuir zoom"
            title="Diminuir zoom"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => setClampedZoom(zoom - 0.5)}
          >
            <Minus aria-hidden="true" />
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.5}
            value={zoom}
            aria-label="Zoom do mapa"
            aria-valuetext={zoomLabel}
            onChange={(event) => setClampedZoom(Number(event.target.value))}
          />
          <button
            type="button"
            className="city-map-control-button"
            aria-label="Aumentar zoom"
            title="Aumentar zoom"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => setClampedZoom(zoom + 0.5)}
          >
            <Plus aria-hidden="true" />
          </button>
          <button
            type="button"
            className="city-map-control-button city-map-home-button"
            aria-label="Voltar ao foco inicial no Sul de Minas"
            title="Voltar ao foco inicial no Sul de Minas"
            onClick={() => setZoom(INITIAL_ZOOM)}
          >
            <LocateFixed aria-hidden="true" />
          </button>
          <button
            type="button"
            className="city-map-control-button city-map-brazil-button"
            aria-label="Mostrar todo o Brasil"
            title="Mostrar todo o Brasil"
            onClick={() => setZoom(MIN_ZOOM)}
          >
            Brasil
          </button>
        </div>
      </div>

      <div className="city-map-summary" aria-live="polite">
        <span><strong>{mappedRecords.toLocaleString('pt-BR')}</strong> inscrições posicionadas</span>
        <span><strong>{bubbles.length.toLocaleString('pt-BR')}</strong> municípios no mapa</span>
        {unlocated.length > 0 && (
          <span><strong>{unlocated.length.toLocaleString('pt-BR')}</strong> municípios sem posição confirmada</span>
        )}
      </div>

      <div className="city-map-viewport">
        <svg
          className="city-bubble-map"
          viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
          role="img"
          aria-label={`Mapa com foco em ${zoomLabel}, mostrando ${bubbles.length} municípios posicionados por quantidade de inscrições`}
        >
          <g className="state-shapes" aria-hidden="true">
            {STATE_SHAPES.map((state) => (
              <path
                key={state.code}
                d={state.path}
                className={state.code === 'MG' ? 'state-shape state-shape-highlight' : 'state-shape'}
              >
                <title>{state.name} ({state.code})</title>
              </path>
            ))}
          </g>
          <g className="municipality-boundaries" aria-hidden="true">
            {municipalBoundaries.map((municipality) => (
              <path
                key={municipality.name}
                d={municipality.path}
                className="municipality-boundary"
              >
                <title>{municipality.name} (MG)</title>
              </path>
            ))}
          </g>
          <g className="city-bubbles">
            {bubbles.map((city) => {
              const radius = bubbleRadius(city.count);
              const percentage = total ? (city.count / total) * 100 : 0;
              return (
                <circle
                  key={`${city.name}-${city.state}`}
                  cx={city.x}
                  cy={city.y}
                  r={radius}
                  className="city-bubble"
                  tabIndex={0}
                  aria-label={`${city.name}, ${city.state}: ${city.count} inscrições, ${percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
                >
                  <title>
                    {`${city.name} (${city.state}) · ${city.count.toLocaleString('pt-BR')} inscrições · ${percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
                  </title>
                </circle>
              );
            })}
          </g>
          {bubbles.length === 0 && (
            <text x={MAP_WIDTH / 2} y={MAP_HEIGHT / 2} textAnchor="middle" className="city-map-empty">
              Nenhum município pôde ser posicionado.
            </text>
          )}
        </svg>
      </div>
      {boundaryLoadError && (
        <p className="city-map-boundary-error" role="alert">
          Não foi possível carregar as divisões municipais. Tente recarregar a página.
        </p>
      )}

      {maxCount > 0 && (
        <div className="city-map-legend" aria-label="Escala das bolhas">
          <span className="city-map-legend-label">Inscrições por município</span>
          {[...new Set([Math.max(1, Math.ceil(maxCount / 10)), Math.max(1, Math.round(maxCount / 2)), maxCount])].map(
            (count) => {
              const diameter = MAX_BUBBLE_RADIUS * 2 * Math.sqrt(count / maxCount);
              return (
                <span className="city-map-legend-example" key={count}>
                  <i style={{ width: diameter, height: diameter }} aria-hidden="true" />
                  {count.toLocaleString('pt-BR')}
                </span>
              );
            },
          )}
        </div>
      )}

      {unlocated.length > 0 && (
        <details className="city-map-unlocated">
          <summary>
            Não foi possível posicionar {unlocated.length.toLocaleString('pt-BR')} município(s).
            A planilha deve incluir a UF para resolver nomes repetidos entre estados.
          </summary>
          <ul>
            {unlocated.map((city) => (
              <li key={`${city.name}-${city.reason}`}>
                {city.name} · {city.count.toLocaleString('pt-BR')} inscrições ·{' '}
                {city.reason === 'ambiguous' ? 'nome em mais de um estado; informe a UF' : 'nome não encontrado'}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="city-map-attribution">
        Limites estaduais e coordenadas municipais são referências geográficas locais; os dados da planilha
        permanecem no navegador.
      </p>
    </Card>
  );
}

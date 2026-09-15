import type { CSSProperties } from "react";
import { CAMELOT_KEYS, getCamelotKey } from "../../lib/musical-key";

type CamelotFilterPanelProps = {
  /** Código Camelot ativo na sessão de browse, ou null para listar tudo. */
  selected: string | null;
  /** Escolhe ou limpa o filtro Camelot. */
  onSelect: (code: string | null) => void;
  /** Classes extras para variantes como o painel flutuante da collection. */
  className?: string;
};

const HOUR_GROUPS = Array.from({ length: 12 }, (_, index) => index + 1);

/**
 * Painel lateral de filtro Camelot agrupado por número 1A/1B … 12A/12B.
 *
 * @param props Seleção atual e callback da sessão de browse.
 */
export function CamelotFilterPanel({ selected, onSelect, className }: CamelotFilterPanelProps) {
  const rootClass = className ? `collection-camelot ${className}` : "collection-camelot";

  return (
    <nav className={rootClass} aria-label="Filtrar por escala Camelot">
      <p className="collection-camelot-label">Key</p>
      <ul className="collection-camelot-list">
        <li>
          <button
            type="button"
            className="collection-camelot-clear"
            data-active={selected === null ? "true" : "false"}
            aria-pressed={selected === null}
            onClick={() => onSelect(null)}
          >
            Todas
          </button>
        </li>
        {HOUR_GROUPS.map((hour) => {
          const keyA = getCamelotKey(`${hour}A`);
          const keyB = getCamelotKey(`${hour}B`);
          if (!keyA || !keyB) return null;
          return (
            <li key={hour} className="collection-camelot-group" data-hour={hour}>
              <span className="collection-camelot-hour" aria-hidden="true">{hour}</span>
              <div className="collection-camelot-pair">
                <CamelotKeyButton code={keyA.code} color={keyA.color} selected={selected} onSelect={onSelect} />
                <CamelotKeyButton code={keyB.code} color={keyB.color} selected={selected} onSelect={onSelect} />
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type CamelotKeyButtonProps = {
  code: string;
  color: string;
  selected: string | null;
  onSelect: (code: string | null) => void;
};

/**
 * Botão de um código Camelot com cor do relógio harmônico.
 *
 * @param props Código, cor, seleção e callback.
 */
function CamelotKeyButton({ code, color, selected, onSelect }: CamelotKeyButtonProps) {
  const entry = CAMELOT_KEYS.find((key) => key.code === code);
  const isActive = selected === code;

  return (
    <button
      type="button"
      className="collection-camelot-key"
      data-active={isActive ? "true" : "false"}
      aria-pressed={isActive}
      aria-label={`Tom ${code}${entry ? ` · ${entry.nameIntl}` : ""}`}
      style={{ "--camelot-color": color } as CSSProperties}
      onClick={() => onSelect(isActive ? null : code)}
    >
      {code}
    </button>
  );
}

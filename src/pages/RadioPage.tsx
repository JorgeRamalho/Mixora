import { RadioErrorBoundary } from "../components/radio/RadioErrorBoundary";
import { RadioStudio } from "../components/radio/RadioStudio";

export function RadioPage() {
  return (
    <div className="page radio-page">
      <p className="kicker">Mamute FM</p>
      <h1>Rádio integrada</h1>
      <p className="lede">
        A rádio liga sozinha ao abrir o site e toca eletrônica em MP3, no aleatório, sem parar.
      </p>
      <RadioErrorBoundary>
        <RadioStudio />
      </RadioErrorBoundary>
    </div>
  );
}

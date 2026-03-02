type Props = {
  content: string;
  onChange: (value: string) => void;
  privacyHint: string;
};

export default function TextInput({ content, onChange, privacyHint }: Props) {
  return (
    <>
      <label className="label" htmlFor="release-input">
        비우고 싶은 마음
      </label>
      <textarea
        id="release-input"
        className="input"
        placeholder="여기에 적어주세요"
        value={content}
        onChange={(event) => onChange(event.target.value)}
        maxLength={1000}
      />
      <p className="hint input-hint">{privacyHint}</p>
    </>
  );
}

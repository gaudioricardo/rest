export default function UfsaView() {
  return (
    <iframe
      src="https://www.ufsa.gov.mz"
      title="UFSA – Concursos Públicos"
      className="w-full flex-1 border-0"
      style={{ minHeight: 0 }}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
    />
  );
}

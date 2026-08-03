type Props = {
  emoji: string;
  title: string;
  value: string;
};

export default function StatCard({
  emoji,
  title,
  value,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="text-3xl">
        {emoji}
      </div>

      <p className="mt-4 text-slate-500">
        {title}
      </p>

      <h2 className="mt-2 text-3xl font-bold">
        {value}
      </h2>

    </div>
  );
}
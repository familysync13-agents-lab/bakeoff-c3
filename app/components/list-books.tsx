/** A book on a list as shown on the list page and the read-only share page. */
export type ShownBook = { id: string; title: string; authors: string; year: number | null };

/** The "Books" section of a list (title, authors and year of each book). */
export function ListBooks({ books }: { books: readonly ShownBook[] }) {
  return (
    <section aria-labelledby="books-heading" className="mt-10">
      <h2 id="books-heading" className="text-xl font-semibold tracking-tight text-slate-900">
        Books
      </h2>
      {books.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-700">
          This list has no books yet.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {books.map((book) => (
            <li key={book.id} className="px-5 py-4">
              <p className="font-semibold break-words text-slate-900">{book.title}</p>
              <p className="mt-0.5 text-sm break-words text-slate-700">
                {book.authors || "Unknown author"}
                {book.year !== null && <span> · {book.year}</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

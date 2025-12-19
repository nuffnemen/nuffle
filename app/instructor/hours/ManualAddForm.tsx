"use client";
import { useState } from "react";
import { manualAdd } from "./actions";

type Student = {
  id: string;
  name: string | null;
  email: string;
};

type Props = {
  students: Student[];
  defaultDate: string;
};

export default function ManualAddForm({ students, defaultDate }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="manual-add">
      <button type="button" className="btn btn-outline" onClick={() => setIsOpen((prev) => !prev)}>
        {isOpen ? "Hide manual entry" : "Manually add hours"}
      </button>

      {isOpen ? (
        <form action={manualAdd} className="manual-add__form">
          <label>
            Student
            <select name="studentId" required>
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name ?? student.email}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" name="date" defaultValue={defaultDate} required />
          </label>
          <label>
            Minutes
            <input type="number" name="minutes" min={15} step={15} required />
          </label>
          <label>
            Program
            <select name="programKey" defaultValue="COSMETOLOGY">
              <option value="COSMETOLOGY">Cosmetology</option>
              <option value="NAIL_TECH">Nail Tech</option>
            </select>
          </label>
          <label>
            Notes
            <textarea name="notes" rows={3} />
          </label>
          <button type="submit" className="btn btn-primary">
            Save & approve
          </button>
        </form>
      ) : null}
    </div>
  );
}

from fastapi.responses import StreamingResponse
import io


def build_excel(history: list):
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment
        from openpyxl.utils import get_column_letter
    except ImportError:
        raise ImportError("openpyxl not installed: pip install openpyxl")

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Debate History"

    # Determine all model score columns
    model_cols = set()
    for row in history:
        for k in row:
            if k.endswith("_score") and k not in ("hallucination_score",):
                model_cols.add(k)
    model_cols = sorted(model_cols)

    headers = ["Query", "Final Decision", "Confidence"] + [c.replace("_score", " Score").title() for c in model_cols]

    # Style header
    header_fill = PatternFill("solid", fgColor="1a1a2e")
    header_font = Font(bold=True, color="FFFFFF")
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")
        ws.column_dimensions[get_column_letter(col)].width = max(20, len(h) + 4)

    # Data rows
    for r_idx, row in enumerate(history, 2):
        ws.cell(r_idx, 1, row.get("query", ""))
        ws.cell(r_idx, 2, row.get("final_decision", ""))
        ws.cell(r_idx, 3, round(row.get("confidence", 0) * 100, 1))
        for c_idx, col in enumerate(model_cols, 4):
            ws.cell(r_idx, c_idx, round(row.get(col, 0), 4))

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=argumind_debates.xlsx"},
    )
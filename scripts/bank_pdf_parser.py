#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""银行流水 PDF 解析器 — 农行 / 招行，输出 VaultFlow 兼容 JSON。"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

try:
    import pdfplumber
except ImportError:
    print("请先安装依赖: pip install pdfplumber", file=sys.stderr)
    sys.exit(1)

TZ_CN = timezone(timedelta(hours=8))

CATEGORY_RULES: list[tuple[str, list[str]]] = [
    ("交通出行", ["地铁", "公交", "深圳通", "羊城通", "高德", "滴滴", "12306", "铁路", "航旅", "单车", "货拉拉"]),
    ("餐饮/外卖", ["美团", "饿了么", "麦当劳", "肯德基", "外卖", "三快", "拉扎斯", "盒马", "咖啡", "奶茶"]),
    ("购物消费", ["京东", "淘宝", "拼多多", "天猫", "苏宁", "唯品会", "得物", "闲鱼", "抖音", "小红书"]),
    ("医疗健康", ["医院", "体检", "挂号", "药", "诊所", "口腔", "疫苗"]),
    ("数码/软件/教育", ["教育", "课程", "考研", "CATTI", "翻译", "有道", "墨墨", "超级考研", "App Store", "Apple"]),
    ("金融投资", ["基金", "理财", "证券", "蚂蚁", "余额宝", "定投", "股票", "黄金", "投资"]),
    ("还款/信贷", ["还款", "信贷", "花呗", "白条", "信用卡", "借呗", "微粒贷", "待还款"]),
    ("工资收入", ["工资", "代发", "奖金", "补贴", "报销", "劳务"]),
    ("银行利息", ["结息", "利息", "批量结息"]),
    ("转账收款", ["转账", "红包", "收款", "银联代付", "银联入账", "网联"]),
]

CMB_HEADER = re.compile(
    r"记账日期|Transaction Statement|Transaction Amount|温馨提示|"
    r"Transaction Statement of China Merchants Bank|^\d+/\d+\s*$",
    re.I,
)
ABC_SKIP = re.compile(
    r"交易日期\s+交易时间\s+交易摘要|中国农业银行账户活期交易明细|起止日期：|"
    r"户名：|第\s*\d+\s*页|共\s*\d+\s*页|打印日期|币种：|该交易明细因不可预测",
)


def now_iso() -> str:
    return datetime.now(TZ_CN).isoformat()


def normalize_ws(text: str) -> str:
    return text.replace("\u00a0", " ").replace("\r", "\n")


def parse_amount(raw: str) -> float:
    s = raw.replace(",", "").strip()
    try:
        return abs(float(s))
    except ValueError:
        return 0.0


def parse_signed(raw: str) -> float:
    s = raw.replace(",", "").strip()
    try:
        return float(s)
    except ValueError:
        return 0.0


def format_abc_date(d: str) -> str:
    if len(d) == 8 and d.isdigit():
        return f"{d[:4]}-{d[4:6]}-{d[6:8]}"
    return d


def format_abc_time(t: str) -> str:
    if len(t) == 6 and t.isdigit():
        return f"{t[:2]}:{t[2:4]}:{t[4:6]}"
    return t


def classify(summary: str, counter: str, note: str, tx_type: str) -> str:
    text = f"{summary} {counter} {note} {tx_type}".lower()
    for cat, keywords in CATEGORY_RULES:
        if any(kw.lower() in text for kw in keywords):
            return cat
    if tx_type == "收入":
        if "工资" in text or "代发" in text:
            return "工资收入"
        if "转账" in text or "收款" in text or "入账" in text:
            return "转账收款"
    return "其他"


def make_id(bank: str, date: str, time: str, amount: float, summary: str, counter: str) -> str:
    key = f"{date}|{time}|{amount:.2f}|{summary}|{counter}"
    h = hashlib.md5(key.encode("utf-8")).hexdigest()[:8]
    prefix = "abc" if bank == "abc" else "cmb"
    safe_date = date.replace("-", "")
    safe_time = time.replace(":", "") if time else "000000"
    return f"{prefix}_{safe_date}_{safe_time}_{amount:.2f}_{h}"


def is_abc_noise(summary: str, amount_str: str) -> bool:
    s = summary.strip()
    if re.search(r"结息|利息税|批量结息", s):
        return True
    signed = parse_signed(amount_str)
    return not signed


def clean_cmb_counter(raw: str) -> str:
    return re.sub(
        r"\s+\d+/\d+\s+记账日期[\s\S]*$|\s+Date Currency[\s\S]*$|\s+记账日期[\s\S]*$",
        "",
        raw,
        flags=re.I,
    ).strip()


def extract_pdf_text(pdf_path: str) -> str:
    parts: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            t = page.extract_text() or ""
            if t.strip():
                parts.append(t)
    return normalize_ws("\n".join(parts))


def detect_bank(text: str, file_name: str) -> str | None:
    name = file_name
    if re.search(r"农行|农业", name):
        return "abc"
    if re.search(r"招商|招行", name):
        return "cmb"
    if "招商银行" in text or re.search(r"Merchants Bank", text, re.I):
        return "cmb"
    if "农业银行" in text or "中国农业银行" in text:
        return "abc"
    if re.search(r"记账日期\s+货币\s+交易金额", text):
        return "cmb"
    if re.search(r"交易日期\s+交易时间\s+交易摘要", text):
        return "abc"
    cmb_rows = len(re.findall(r"\d{4}-\d{2}-\d{2}\s+CNY\s+[+\-]?[\d,]+\.\d{2}", text))
    abc_rows = len(re.findall(r"\d{8}\s+\d{6}\s+\S+\s+[+\-][\d,]+\.\d{2}", text))
    if cmb_rows >= 2 and cmb_rows >= abc_rows:
        return "cmb"
    if abc_rows >= 2:
        return "abc"
    return None


def parse_cmb(text: str, file_name: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    normalized = normalize_ws(text)

    pattern = re.compile(
        r"(\d{4}-\d{2}-\d{2})\s+CNY\s+([+\-]?[\d,]+\.\d{2})\s+([+\-]?[\d,]+\.\d{2})\s+(\S+)\s+([\s\S]*?)"
        r"(?=\d{4}-\d{2}-\d{2}\s+CNY|\d+/\d+\s*记账日期|$)",
    )
    for m in pattern.finditer(normalized):
        date_str, amount_str, _bal, summary, counter_raw = m.groups()
        if CMB_HEADER.search(summary):
            continue
        signed = parse_signed(amount_str)
        if not signed:
            continue
        counter = clean_cmb_counter(counter_raw) or summary
        tx_type = "收入" if signed >= 0 else "支出"
        amount = abs(signed)
        cat = classify(summary, counter, "", tx_type)
        records.append(
            _build_record("cmb", file_name, date_str, "", tx_type, amount, summary, counter, cat)
        )

    if records:
        return records

    for segment in re.split(r"(?=\d{4}-\d{2}-\d{2})", normalized):
        line = re.sub(r"\s+", " ", segment).strip()
        if not line or CMB_HEADER.search(line):
            continue
        strict = re.match(
            r"^(\d{4}-\d{2}-\d{2})\s+CNY\s+([+\-]?[\d,]+\.\d{2})\s+([+\-]?[\d,]+\.\d{2})\s+(\S+)\s+(.+)$",
            line,
        )
        if strict:
            date_str, amount_str, _, summary, counter_raw = strict.groups()
            signed = parse_signed(amount_str)
            if not signed:
                continue
            counter = clean_cmb_counter(counter_raw) or summary
            tx_type = "收入" if signed >= 0 else "支出"
            records.append(
                _build_record(
                    "cmb", file_name, date_str, "", tx_type, abs(signed), summary, counter,
                    classify(summary, counter, "", tx_type),
                )
            )
    return records


def merge_abc_lines(text: str) -> list[str]:
    lines = normalize_ws(text).split("\n")
    merged: list[str] = []
    for raw in lines:
        line = raw.strip()
        if not line or ABC_SKIP.search(line):
            continue
        if re.match(r"^\d{8}\s+\d{6}\s", line):
            merged.append(line)
            continue
        if merged and not re.match(r"^\d", line) and not re.search(r"[+\-]?\d+\.\d{2}", line):
            merged[-1] += re.sub(r"\s+", "", line)
    if merged:
        return merged
    return [p.strip() for p in re.split(r"(?=\d{8}\s+\d{6}\s+)", text) if len(p.strip()) > 8]


def parse_abc_line(line: str, file_name: str) -> dict[str, Any] | None:
    normalized = re.sub(r"\s+", " ", line).strip()
    patterns = [
        r"^(\d{8})\s+(\d{6})\s+(\S+)\s+([+\-]?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+(.+?)\s+(\S+)\s+(\S+)\s+(.+)$",
        r"^(\d{8})\s+(\d{6})\s+(\S+)\s+([+\-]?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+(.+)$",
        r"^(\d{8})\s+(\d{6})\s+(.+?)\s+([+\-]?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})(?:\s+(.+))?$",
    ]
    for i, pat in enumerate(patterns):
        m = re.match(pat, normalized)
        if not m:
            continue
        date_str = m.group(1)
        time_str = m.group(2)
        if i == 0:
            summary, amount_str, counter = m.group(3), m.group(4), m.group(9) or m.group(6) or ""
        elif i == 1:
            summary, amount_str, counter = m.group(3), m.group(4), (m.group(6) or "").strip()
        else:
            body = m.group(3).strip().split()
            summary = body[0] if body else "银行流水"
            amount_str = m.group(4)
            counter = (m.group(6) or " ".join(body[1:]) or summary).strip()
        if is_abc_noise(summary, amount_str):
            return None
        signed = parse_signed(amount_str)
        if not signed:
            return None
        date_fmt = format_abc_date(date_str)
        time_fmt = format_abc_time(time_str)
        tx_type = "收入" if signed >= 0 else "支出"
        return _build_record(
            "abc", file_name, date_fmt, time_fmt, tx_type, abs(signed), summary, counter,
            classify(summary, counter, "", tx_type),
        )
    return None


def parse_abc(text: str, file_name: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    normalized = normalize_ws(text)

    pattern = re.compile(
        r"(\d{8})\s+(\d{6})\s+(\S+)\s+([+\-]?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\s\S]*?)"
        r"(?=\d{8}\s+\d{6}\s+|该交易明细因不可预测|$)",
    )
    for m in pattern.finditer(normalized):
        date_str, time_str, summary, amount_str, _, tail = m.groups()
        if is_abc_noise(summary, amount_str):
            continue
        signed = parse_signed(amount_str)
        if not signed:
            continue
        counter = re.sub(
            r"\s+第\s*\d+\s*页[\s\S]*$|\s+\d{8}\s+\d{6}\s+[\s\S]*$",
            "",
            tail,
            flags=re.I,
        ).strip() or summary
        date_fmt = format_abc_date(date_str)
        time_fmt = format_abc_time(time_str)
        tx_type = "收入" if signed >= 0 else "支出"
        records.append(
            _build_record(
                "abc", file_name, date_fmt, time_fmt, tx_type, abs(signed), summary, counter,
                classify(summary, counter, tail, tx_type),
            )
        )

    if records:
        return records

    for line in merge_abc_lines(normalized):
        rec = parse_abc_line(line, file_name)
        if rec:
            records.append(rec)
    return records


def _build_record(
    bank: str,
    file_name: str,
    date: str,
    time: str,
    tx_type: str,
    amount: float,
    summary: str,
    counter: str,
    category: str,
    note: str = "",
    channel: str = "",
    balance: float | None = None,
) -> dict[str, Any]:
    source = "农业银行" if bank == "abc" else "招商银行"
    account = "农行" if bank == "abc" else "招行"
    rid = make_id(bank, date, time, amount, summary, counter)
    rec: dict[str, Any] = {
        "id": rid,
        "date": date,
        "time": time,
        "type": tx_type,
        "amount": round(amount, 2),
        "summary": summary,
        "counter": counter,
        "channel": channel,
        "note": note,
        "source": source,
        "account": account,
        "category": category,
        "importedAt": now_iso(),
        "fileName": file_name,
    }
    if balance is not None:
        rec["balance"] = round(balance, 2)
    return rec


def load_history(history_path: Path) -> dict[str, Any]:
    if history_path.exists():
        try:
            return json.loads(history_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return {"ids": [], "transactions": []}


def merge_history(history: dict[str, Any], new_records: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int, int]:
    seen = set(history.get("ids", []))
    merged = list(history.get("transactions", []))
    added = 0
    dup = 0
    for rec in new_records:
        rid = rec["id"]
        if rid in seen:
            dup += 1
            continue
        seen.add(rid)
        merged.append(rec)
        added += 1
    history["ids"] = list(seen)
    history["transactions"] = merged
    return merged, added, dup


def save_outputs(
    output_dir: Path,
    bank: str,
    records: list[dict[str, Any]],
    file_name: str,
    incremental: bool,
) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(TZ_CN).strftime("%Y%m%d_%H%M%S")
    prefix = f"{bank}_流水_{stamp}"
    history_path = output_dir / f"{bank}_history.json"

    if incremental:
        history = load_history(history_path)
        all_records, added, dup = merge_history(history, records)
        history_path.write_text(json.dumps(history, ensure_ascii=False, indent=2), encoding="utf-8")
    else:
        all_records = records
        added, dup = len(records), 0
        history_path.write_text(
            json.dumps({"ids": [r["id"] for r in records], "transactions": records}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    json_path = output_dir / f"{prefix}.json"
    csv_path = output_dir / f"{prefix}.csv"
    payload = {
        "bank": bank,
        "source": "农业银行" if bank == "abc" else "招商银行",
        "fileName": file_name,
        "parsedAt": now_iso(),
        "count": len(all_records),
        "newCount": added,
        "duplicateCount": dup,
        "dateRange": _date_range(all_records),
        "categoryStats": _category_stats(all_records),
        "transactions": all_records,
    }
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["date", "time", "type", "amount", "summary", "counter", "category", "source", "fileName"],
        )
        writer.writeheader()
        for r in all_records:
            writer.writerow({k: r.get(k, "") for k in writer.fieldnames})

    return {
        "bank": bank,
        "fileName": file_name,
        "count": len(records),
        "newCount": added,
        "duplicateCount": dup,
        "jsonPath": str(json_path),
        "csvPath": str(csv_path),
        "transactions": all_records,
    }


def _date_range(records: list[dict[str, Any]]) -> dict[str, str]:
    dates = sorted(r["date"] for r in records if r.get("date"))
    if not dates:
        return {"min": "", "max": ""}
    return {"min": dates[0], "max": dates[-1]}


def _category_stats(records: list[dict[str, Any]]) -> dict[str, int]:
    stats: dict[str, int] = {}
    for r in records:
        cat = r.get("category", "其他")
        stats[cat] = stats.get(cat, 0) + 1
    return stats


def parse_pdf(pdf_path: str, verify_only: bool = False) -> dict[str, Any]:
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"文件不存在: {pdf_path}")
    text = extract_pdf_text(str(path))
    if not text.strip():
        raise ValueError("PDF 无文字层（可能是扫描件），请使用 AI 兜底方案")
    bank = detect_bank(text, path.name)
    if not bank:
        raise ValueError(f"无法识别银行类型: {path.name}")
    records = parse_abc(text, path.name) if bank == "abc" else parse_cmb(text, path.name)
    if not records:
        raise ValueError(f"未能从 PDF 识别有效流水: {path.name}")
    result = {
        "bank": bank,
        "fileName": path.name,
        "count": len(records),
        "dateRange": _date_range(records),
        "categoryStats": _category_stats(records),
        "transactions": records,
    }
    if verify_only:
        result["verifyOnly"] = True
    return result


def clear_history(output_dir: Path) -> None:
    if not output_dir.exists():
        return
    for p in output_dir.glob("*_history.json"):
        p.unlink(missing_ok=True)


def run_cli(args: argparse.Namespace) -> int:
    output_dir = Path(args.output_dir).resolve()
    if args.clear_history:
        clear_history(output_dir)
        print(json.dumps({"cleared": True, "outputDir": str(output_dir)}, ensure_ascii=False))

    results: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []

    for pdf in args.files:
        try:
            parsed = parse_pdf(pdf, verify_only=args.verify)
            if args.verify:
                results.append(parsed)
                continue
            saved = save_outputs(
                output_dir,
                parsed["bank"],
                parsed["transactions"],
                parsed["fileName"],
                incremental=not args.no_incremental,
            )
            saved.pop("transactions", None)
            results.append(saved)
        except Exception as e:
            errors.append({"file": pdf, "error": str(e)})

    summary = {
        "ok": len(errors) == 0,
        "results": results,
        "errors": errors,
        "outputDir": str(output_dir),
    }
    print(json.dumps(summary, ensure_ascii=False))
    return 0 if not errors else 1


def run_gui() -> None:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk

    output_dir = Path(__file__).resolve().parent / "output"
    output_dir.mkdir(exist_ok=True)

    root = tk.Tk()
    root.title("🏦 银行流水 PDF 智能解析器")
    root.geometry("560x480")
    root.configure(padx=12, pady=12)

    verify_var = tk.BooleanVar(value=False)
    incremental_var = tk.BooleanVar(value=True)
    log = tk.Text(root, height=16, wrap=tk.WORD, font=("Menlo", 10))
    progress = ttk.Progressbar(root, mode="determinate")

    def append(msg: str) -> None:
        log.insert(tk.END, msg + "\n")
        log.see(tk.END)
        root.update_idletasks()

    def pick_files() -> None:
        paths = filedialog.askopenfilenames(filetypes=[("PDF", "*.pdf")])
        if not paths:
            return
        log.delete("1.0", tk.END)
        progress["maximum"] = len(paths)
        progress["value"] = 0
        for i, pdf in enumerate(paths):
            append(f"解析: {Path(pdf).name}")
            try:
                parsed = parse_pdf(pdf, verify_only=verify_var.get())
                if verify_var.get():
                    append(f"✅ 预览: {parsed['bank']} | {parsed['count']} 条")
                    append(f"📅 {parsed['dateRange']['min']} ~ {parsed['dateRange']['max']}")
                else:
                    saved = save_outputs(
                        output_dir,
                        parsed["bank"],
                        parsed["transactions"],
                        parsed["fileName"],
                        incremental=incremental_var.get(),
                    )
                    append(f"✅ {saved['bank']} | {saved['count']} 条")
                    append(f"🆕 新增 {saved['newCount']} | 🔄 重复 {saved['duplicateCount']}")
                    append(f"💾 JSON: {saved['jsonPath']}")
            except Exception as e:
                append(f"❌ {e}")
            progress["value"] = i + 1
        append("=" * 40)

    def clear_hist() -> None:
        clear_history(output_dir)
        append("🗑️ 已清除历史去重数据")

    tk.Label(root, text="银行流水 PDF 智能解析器", font=("", 14, "bold")).pack(anchor="w")
    btn_row = tk.Frame(root)
    btn_row.pack(fill=tk.X, pady=8)
    tk.Button(btn_row, text="📁 选择 PDF", command=pick_files).pack(side=tk.LEFT, padx=(0, 8))
    tk.Button(btn_row, text="🗑️ 清除历史", command=clear_hist).pack(side=tk.LEFT)
    tk.Checkbutton(root, text="仅预览（不保存）", variable=verify_var).pack(anchor="w")
    tk.Checkbutton(root, text="增量更新（合并历史）", variable=incremental_var).pack(anchor="w")
    progress.pack(fill=tk.X, pady=8)
    tk.Label(root, text="📋 解析日志").pack(anchor="w")
    log.pack(fill=tk.BOTH, expand=True)
    root.mainloop()


def main() -> None:
    parser = argparse.ArgumentParser(description="银行流水 PDF 解析器（农行/招行）")
    parser.add_argument("files", nargs="*", help="PDF 文件路径")
    parser.add_argument("--verify", action="store_true", help="仅预览，不写入 output")
    parser.add_argument("--cli", action="store_true", help="命令行模式，结果 JSON 输出到 stdout")
    parser.add_argument("--output-dir", default=str(Path(__file__).resolve().parent / "output"))
    parser.add_argument("--no-incremental", action="store_true", help="禁用增量合并")
    parser.add_argument("--clear-history", action="store_true", help="清除 output 历史 JSON")
    args = parser.parse_args()

    if args.cli or args.files or args.clear_history:
        sys.exit(run_cli(args))
    run_gui()


if __name__ == "__main__":
    main()

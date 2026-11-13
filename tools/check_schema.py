import sqlite3, sys
sql = open(sys.argv[1], encoding='utf-8').read()
c = sqlite3.connect(':memory:')
c.executescript(sql)
now = '2026-11-13T11:00:00.000Z'
c.execute("insert into sources values ('s1','demo','Demo','include','mine','{}',?,null)", (now,))
c.execute("insert into threads values ('t1','s1','x1','Facharbeit',?,0)", (now,))
c.execute("""insert into entries (id,source_id,thread_id,kind,role,original_created_at,ingested_at,original_text,content_hash)
             values ('e1','s1','t1','message','originator',?,?,'Es waren 4.000 Bienen','h1')""", (now, now))
ok = []
def expect_fail(stmt, label):
    try:
        c.execute(stmt); print('FEHLER: kein Abbruch bei', label); sys.exit(1)
    except sqlite3.DatabaseError as e:
        ok.append(f'{label}: {e}')
expect_fail("update entries set original_text='x' where id='e1'", 'Original aendern')
expect_fail("delete from entries where id='e1'", 'Eintrag loeschen')
expect_fail("""insert into entries (id,source_id,kind,role,original_created_at,ingested_at,original_text,content_hash)
             values ('e2','s1','message','originator','a','b','c','h1')""", 'Duplikat')
c.execute("insert into operations values ('o1','entry.correct','user','{}','{}',?,null,null)", (now,))
c.execute("insert into entry_versions values ('e1',2,'Es waren 400 Bienen',?,'user','Tippfehler','o1')", (now,))
c.execute("update entries set current_version=2 where id='e1'")
expect_fail("update entry_versions set text='y'", 'Version aendern')
row = c.execute("select text, original_text, is_corrected from entries_current where id='e1'").fetchone()
assert row == ('Es waren 400 Bienen', 'Es waren 4.000 Bienen', 1), row
assert c.execute("select count(*) from entries_visible").fetchone()[0] == 1
c.execute("update threads set not_mine=1 where id='t1'")
assert c.execute("select count(*) from entries_visible").fetchone()[0] == 0
c.execute("update threads set not_mine=0 where id='t1'")
c.execute("insert into search_index (target_type,target_id,title,body) values ('entry','e1','Facharbeit','Es waren 400 Bienen über die Wiese')")
hit = c.execute("select target_id from search_index where search_index match 'uber'").fetchone()
assert hit == ('e1',), hit
c.execute("insert into notes (id,path,title,author,created_at,updated_at) values ('n1','Projekte/Facharbeit.md','Facharbeit','user',?,?)", (now, now))
c.execute("insert into note_versions values ('n1',1,'# Facharbeit',?,'user',null,null)", (now,))
assert c.execute("select body_md from notes_current").fetchone() == ('# Facharbeit',)
tables = [r[0] for r in c.execute("select name from sqlite_master where type in ('table','view') order by name")]
print('OK – SQLite', sqlite3.sqlite_version)
print('\n'.join(ok))
print(len(tables), 'Tabellen/Views:', ', '.join(t for t in tables if not t.startswith('search_index_')))

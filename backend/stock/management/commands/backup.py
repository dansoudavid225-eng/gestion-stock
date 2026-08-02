import os
import shutil
import subprocess
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Sauvegarde la base de données (SQLite en local, pg_dump en production/Postgres)'

    def handle(self, *args, **options):
        backup_dir = settings.BASE_DIR / 'backups'
        backup_dir.mkdir(exist_ok=True)

        db_config = settings.DATABASES['default']
        engine = db_config['ENGINE']
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        if 'postgresql' in engine:
            backup_path = backup_dir / f'backup_{timestamp}.dump'
            env = os.environ.copy()
            if db_config.get('PASSWORD'):
                env['PGPASSWORD'] = db_config['PASSWORD']

            cmd = [
                'pg_dump',
                '-h', db_config.get('HOST') or 'localhost',
                '-p', str(db_config.get('PORT') or '5432'),
                '-U', db_config.get('USER') or 'postgres',
                '-F', 'c',  # format custom compressé, restaurable avec pg_restore
                '-f', str(backup_path),
                db_config.get('NAME') or 'postgres',
            ]

            try:
                subprocess.run(cmd, env=env, check=True, capture_output=True, text=True)
            except FileNotFoundError:
                self.stdout.write(self.style.ERROR(
                    "pg_dump introuvable. Installez le paquet postgresql-client sur le serveur."
                ))
                return
            except subprocess.CalledProcessError as e:
                self.stdout.write(self.style.ERROR(f"Échec de pg_dump : {e.stderr}"))
                return

            self.stdout.write(self.style.SUCCESS(f'Sauvegarde créée : {backup_path}'))
            pattern = '*.dump'

        elif 'sqlite3' in engine:
            db_path = settings.BASE_DIR / 'db.sqlite3'
            if not db_path.exists():
                self.stdout.write(self.style.ERROR('Base de données introuvable'))
                return

            backup_path = backup_dir / f'backup_{timestamp}.sqlite3'
            shutil.copy2(db_path, backup_path)
            self.stdout.write(self.style.SUCCESS(f'Sauvegarde créée : {backup_path}'))
            pattern = '*.sqlite3'

        else:
            self.stdout.write(self.style.ERROR(f"Moteur de base de données non supporté : {engine}"))
            return

        # Ne garder que les 30 sauvegardes les plus récentes.
        backups = sorted(backup_dir.glob(pattern))
        while len(backups) > 30:
            oldest = backups.pop(0)
            oldest.unlink()
            self.stdout.write(f'Ancienne sauvegarde supprimée : {oldest}')

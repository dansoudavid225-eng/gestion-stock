import os
import shutil
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Sauvegarde la base de données'

    def handle(self, *args, **options):
        backup_dir = settings.BASE_DIR / 'backups'
        backup_dir.mkdir(exist_ok=True)

        db_path = settings.BASE_DIR / 'db.sqlite3'
        if not db_path.exists():
            self.stdout.write(self.style.ERROR('Base de données introuvable'))
            return

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_path = backup_dir / f'backup_{timestamp}.sqlite3'
        shutil.copy2(db_path, backup_path)
        self.stdout.write(self.style.SUCCESS(f'Sauvegarde créée : {backup_path}'))

        backups = sorted(backup_dir.glob('*.sqlite3'))
        while len(backups) > 30:
            backups[0].unlink()
            backups.pop(0)
            self.stdout.write(f'Ancienne sauvegarde supprimée : {backups[0]}')

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('stock', '0002_shopsettings'),
    ]

    operations = [
        migrations.CreateModel(
            name='Customer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('phone', models.CharField(blank=True, max_length=50)),
                ('email', models.EmailField(blank=True, max_length=254)),
                ('address', models.TextField(blank=True)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('total_purchases', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('total_credit', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
    ]

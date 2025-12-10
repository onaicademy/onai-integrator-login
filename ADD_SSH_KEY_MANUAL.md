# 🔑 Добавление SSH ключа вручную

## Способ 1: Через терминал (с паролем)

```bash
cat ~/.ssh/id_rsa.pub | ssh root@207.154.231.30 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

Когда попросит пароль, введи: `Onai2134!!!`

## Способ 2: Через Digital Ocean Console

1. Зайди на https://cloud.digitalocean.com/
2. Droplets → 207.154.231.30
3. Нажми **"Access"** → **"Launch Droplet Console"**
4. Введи пароль: `Onai2134!!!`
5. Выполни:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
```

6. Добавь в конец файла:

```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCm69QeT/Tv+NdQxJngOf50n3vkxqezIpArv9j02s0ABbcPuRd5AyR3ORq/svp7uckSUlnp94J0yZI26n+bDjTSWi4xmz9WJxZsvLcnIlD+C5VTd7AVGVzYEI5veZs84mH4WElBvwqHC6JKBNpCihTzFX+ByvTatj08C+hwx7VkNCh+eS6iLmh/8eK/B98fNJ1ywr+GrsanRdE6XPaEyjtzCiG7EpDDpt1GmVTEzwC66cAhHx0YWYdCoeEn+hpV+a/xtjpT6P2LSqAbYSdmE91BXb6+ORt1N8AvrZeSB0PP6igV7BLndOqerQTm5z/M7cUO+CIThz0wP4TkSuN20C87I1pe0S0Ph1sMQjErjvGe0E+wQQqTIJk25NqA+rMPeRyBLdig8P6aD9NP+ZBX4erlrL8ZV9ncePdU6zXoDfENEucglwzcwIRZo2jxCfyDXwtD+Q9qQGVk63hFqAm49T6giGhWmyREckErh3jbUySaP36ReTY3Ukkt2/AAfccGGRM= your_email@example.com
```

7. Сохрани (Ctrl+O, Enter, Ctrl+X)
8. Установи права:

```bash
chmod 600 ~/.ssh/authorized_keys
```

## Проверка

После добавления ключа, проверь:

```bash
ssh onai-backend "echo 'SSH works!'"
```

Если видишь "SSH works!" - все готово!

Потом запусти: `./scripts/deploy-backend.sh`

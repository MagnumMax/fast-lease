#!/bin/bash

# Массив файлов для обработки
files=(
  "cars/rolls-royce-cullinan/index.html"
  "cars/rivian-r1t-adventure/index.html" 
  "cars/volvo-xc40-recharge/index.html"
)

for file in "${files[@]}"; do
  echo "Обработка файла: $file"
  
  # Добавляем контейнер для кнопки после тега <main>
  sed -i 's/<main class="mx-auto w-full max-w-6xl px-6 py-10 space-y-8">/<main class="mx-auto w-full max-w-6xl px-6 py-10 space-y-8">\n    <div id="back-to-list-container"><\/div>/' "$file"
  
  # Добавляем импорт функции mountBackToListButton
  sed -i 's/const { applyIcons\(.*\) } = shared;/const { applyIcons\1, mountBackToListButton } = shared;/' "$file"
  
  # Добавляем вызов функции перед applyIcons()
  sed -i '/applyIcons();/i\    \
    // Добавить кнопку "Назад к списку"\
    mountBackToListButton({\
      containerId: '\''back-to-list-container'\'',\
      listHref: '\''..\/..\/index.html'\'',\
      label: '\''← Все автомобили'\''\
    });' "$file"
    
  echo "Обработан: $file"
done

echo "Готово!"

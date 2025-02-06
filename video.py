import requests

url = "https://v-tos-k.xiaoeknow.com/522ff1e0vodcq1252524126/d83fae8f1397757899232425421/3994427038_109810937_24.ts?resolution=1920x1080&t=679adb95&us=cIKHwrXNsT&time=1738158804749&uuid=u_672c5f7a191d9_xCjk6vu40Y&sign=7f07cf2dc060301213597a9e849b4f74"
headers = {
    "accept":"*/*",
    "accept-encoding":"gzip, deflate, br, zstd",
    "accept-language":"zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
    "user-agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0"
}

response = requests.get(url,headers=headers)
with open('video.mp4',"wb") as f:
    f.write(response.content)

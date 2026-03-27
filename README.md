export LD_PRELOAD=/home/jetiot/factory-ai-platform/backend/venv/lib/python3.12/site-packages/torch/lib/libgomp.so.1:/home/jetiot/factory-ai-platform/backend/venv/lib/python3.12/site-packages/torch/lib/libc10.so



((venv) ) jetiot@linux:~/factory-ai-platform/backend$ chmod +x ~/factory-ai-platform/backend/s
tart.sh

((venv) ) jetiot@linux:~/factory-ai-platform/backend$ ~/factory-ai-platform/backend/start.sh


Bhai ye naa mene RAG complaince vale tab me pucha tha ki machine ka uptime report dedo toh usme uski chat me toh bata diya lekin jo download vali report hai vo weekly report ki hi hai toh usko uptime vali matlab jo me prompt du vesi report bana ke dena chaiye tha usko.
toh esa banana hai apne ko toh batate jana banadenge apan.

and meko working bhi smajha de jo report aari hai vo rag se generate hori hai download vali ya kya process hai uska samjha dena.

ye ra vo chat tere refrence ke liye:
Give me the uptime report of machine 3
05:04 pm
AI
**Uptime Report for Machine_3 (Conveyor Motor)**  From 22 Feb 2026 to 23 Mar 2026:  - Total downtime incidents: 5 - Total downtime minutes: 800 - Average uptime percentage: 68.2%  **Detailed Uptime Report:**  1. Incident on 2026-02-24: Duration 138 minutes, Reason: Vibration warning - bearing inspection, Operator on duty: Arvind M., Machine uptime that day: 71.2% 2. Incident on 2026-02-25: Duration 151 minutes, Reason: Coolant refill, Operator on duty: Priya S., Machine uptime that day: 68.5% 3. Incident on 2026-03-01: Duration 204 minutes, Reason: Tool change, Operator on duty: Dinesh T., Machine uptime that day: 57.5% 4. Incident on 2026-03-17: Duration 131 minutes, Reason: Scheduled maintenance, Operator on duty: Ramesh K., Machine uptime that day: 72.7% 5. Incident on 2026-03-19: Duration 176 minutes, Reason: Vibration warning - bearing inspection, Operator on duty: Ramesh K., Machine uptime that day: 63.3%  **Recommendation:** Review maintenance schedules and operator logs to identify potential causes of downtime and implement corrective actions to improve machine uptime.  Would you like to generate a report for a specific date range?  1-week, 1-month, or custom date range?  I've detected you want a weekly report for Machine 3. Use the download buttons below to get your report in PDF or Excel format.
📥 Download Report — Machine 3 (weekly):
05:04 pm

from torch import nn


class RiskMLP(nn.Module):
    def __init__(self, input_size: int):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(input_size, 96),
            nn.ReLU(),
            nn.Dropout(0.08),
            nn.Linear(96, 48),
            nn.ReLU(),
            nn.Linear(48, 1),
        )

    def forward(self, values):
        return self.layers(values).squeeze(-1)
